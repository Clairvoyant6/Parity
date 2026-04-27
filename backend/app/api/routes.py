from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import JSONResponse
import pandas as pd
import json
import io
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.bias_engine import compute_bias_metrics
from app.services.explanation_service import generate_explanation

router = APIRouter()

# ---------- HEALTH CHECK ----------
@router.get("/health")
def health_check():
    return {"status": "FairLens backend is running ✅", "version": "1.0.0"}


# ---------- UPLOAD & ANALYZE ----------
@router.post("/analyze")
async def analyze_dataset(
    file: UploadFile = File(...),
    target_column: str = Form(...),
    sensitive_columns: str = Form(...),   # comma-separated string
    domain: str = Form(default="general"),
    db: Session = Depends(get_db)
):
    """
    Main endpoint: upload CSV, run bias analysis, return metrics + explanation
    """
    # 1. Validate file type
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    # 2. Read CSV
    try:
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode("utf-8")))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read CSV: {str(e)}")

    # 3. Parse sensitive columns
    sens_cols = [c.strip() for c in sensitive_columns.split(",") if c.strip()]

    # 4. Validate columns exist
    missing = [c for c in sens_cols + [target_column] if c not in df.columns]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"These columns not found in CSV: {missing}. Available: {df.columns.tolist()}"
        )

    # 5. Run bias engine
    try:
        metrics = compute_bias_metrics(df, target_column, sens_cols)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Bias computation failed: {str(e)}")

    # 6. Generate AI explanation with RAG context and citations
    explanation_result = await generate_explanation(metrics, sens_cols, domain)
    
    # Handle both old format (string) and new format (dict with citations)
    if isinstance(explanation_result, dict):
        metrics["explanation"] = explanation_result.get("explanation", "")
        metrics["citations"] = explanation_result.get("citations", [])
        metrics["sources"] = explanation_result.get("sources", [])
    else:
        # Backward compatibility
        metrics["explanation"] = explanation_result
        metrics["citations"] = []
        metrics["sources"] = []

    return JSONResponse(content={
        "status": "success",
        "filename": file.filename,
        "target_column": target_column,
        "sensitive_columns": sens_cols,
        "domain": domain,
        "results": metrics
    })


# ---------- PREVIEW CSV COLUMNS ----------
@router.post("/preview")
async def preview_csv(file: UploadFile = File(...)):
    """Returns column names + first 5 rows so frontend can show column selector"""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files supported")
    try:
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode("utf-8")))
        return {
            "columns": df.columns.tolist(),
            "shape": {"rows": len(df), "cols": len(df.columns)},
            "preview": df.head(5).fillna("").to_dict(orient="records")
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ---------- WHAT-IF COUNTERFACTUAL ----------
@router.post("/whatif")
async def what_if_analysis(
    file: UploadFile = File(...),
    target_column: str = Form(...),
    sensitive_columns: str = Form(...),
    changed_feature: str = Form(...),
    original_value: str = Form(...),
    new_value: str = Form(...)
):
    """Changes one feature value across all rows and re-runs analysis to show impact"""
    try:
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode("utf-8")))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    if changed_feature not in df.columns:
        raise HTTPException(status_code=400, detail=f"Feature '{changed_feature}' not in dataset")

    sens_cols = [c.strip() for c in sensitive_columns.split(",")]

    # Original analysis
    original_metrics = compute_bias_metrics(df.copy(), target_column, sens_cols)

    # Modified analysis
    df_modified = df.copy()
    df_modified[changed_feature] = df_modified[changed_feature].replace(original_value, new_value)
    modified_metrics = compute_bias_metrics(df_modified, target_column, sens_cols)

    return {
        "changed_feature": changed_feature,
        "original_value": original_value,
        "new_value": new_value,
        "original_risk_score": original_metrics["bias_risk_score"],
        "modified_risk_score": modified_metrics["bias_risk_score"],
        "original_metrics": original_metrics,
        "modified_metrics": modified_metrics,
        "impact": "IMPROVED" if modified_metrics["bias_risk_score"] < original_metrics["bias_risk_score"] else "WORSENED"
    }


# ---------- LIST PRELOADED DATASETS ----------
@router.get("/datasets")
def list_datasets():
    return {
        "datasets": [
            {
                "name": "COMPAS Recidivism",
                "description": "Criminal justice risk scores — known racial bias",
                "domain": "criminal_justice",
                "suggested_target": "two_year_recid",
                "suggested_sensitive": "race,sex"
            },
            {
                "name": "UCI Adult Income",
                "description": "Census income prediction dataset",
                "domain": "hiring",
                "suggested_target": "income",
                "suggested_sensitive": "sex,race"
            }
        ]
    }
from fastapi.responses import Response
from app.services.report_service import generate_pdf_report

@router.post("/export-report")
async def export_report(
    file: UploadFile = File(...),
    target_column: str = Form(...),
    sensitive_columns: str = Form(...),
    domain: str = Form(default="general")
):
    """Run analysis and return downloadable PDF report"""
    contents = await file.read()
    df = pd.read_csv(io.StringIO(contents.decode("utf-8")))
    sens_cols = [c.strip() for c in sensitive_columns.split(",")]
    
    metrics = compute_bias_metrics(df, target_column, sens_cols)
    explanation = await generate_explanation(metrics, sens_cols, domain)
    metrics["explanation"] = explanation
    
    pdf_bytes = generate_pdf_report(metrics, file.filename, sens_cols, domain)
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=fairlens_report.pdf"}
    )