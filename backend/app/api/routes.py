from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse, Response
import pandas as pd
import io
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.analysis_repository import (
    analysis_detail,
    analysis_summary,
    get_analysis_by_id,
    list_analyses,
    new_analysis_id,
    save_successful_analysis,
)
from app.services.dataset_catalog import get_dataset_catalog
from app.services.bias_engine import compute_bias_metrics

router = APIRouter()


def _parse_sensitive_columns(raw_sensitive_columns: str) -> list[str]:
    if raw_sensitive_columns is None or not raw_sensitive_columns.strip():
        raise HTTPException(
            status_code=400,
            detail="sensitive_columns must include at least one column name",
        )

    parsed = [column.strip() for column in raw_sensitive_columns.split(",")]
    if any(not column for column in parsed):
        raise HTTPException(
            status_code=400,
            detail="sensitive_columns cannot contain empty column names",
        )

    if len(parsed) != len(set(parsed)):
        raise HTTPException(
            status_code=400,
            detail="sensitive_columns cannot contain duplicate column names",
        )

    return parsed


def _validate_columns(df: pd.DataFrame, target_column: str, sensitive_columns: list[str]) -> None:
    missing = [column for column in [target_column, *sensitive_columns] if column not in df.columns]
    if missing:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "These columns were not found in the CSV",
                "missing_columns": missing,
                "available_columns": df.columns.tolist(),
            },
        )


async def _compute_analysis_results(
    df: pd.DataFrame,
    target_column: str,
    sensitive_columns: list[str],
    domain: str,
) -> dict:
    metrics = compute_bias_metrics(df, target_column, sensitive_columns)

    explanation_result = await generate_explanation(metrics, sensitive_columns, domain)
    if isinstance(explanation_result, dict):
        metrics["explanation"] = explanation_result.get("explanation", "")
        metrics["citations"] = explanation_result.get("citations", [])
        metrics["sources"] = explanation_result.get("sources", [])
    else:
        metrics["explanation"] = explanation_result
        metrics["citations"] = []
        metrics["sources"] = []

    return metrics


async def generate_explanation(metrics: dict, sensitive_columns: list[str], domain: str):
    try:
        from app.services.explanation_service import generate_explanation as explanation_impl
    except Exception:
        risk_score = metrics.get("bias_risk_score", 0)
        if risk_score >= 70:
            level = "high"
        elif risk_score >= 40:
            level = "medium"
        else:
            level = "low"
        return {
            "explanation": (
                f"Bias analysis completed for {domain} with {level} risk across "
                f"{', '.join(sensitive_columns)}."
            ),
            "citations": [],
            "sources": [],
        }

    return await explanation_impl(metrics, sensitive_columns, domain)

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
    sens_cols = _parse_sensitive_columns(sensitive_columns)

    # 4. Validate columns exist
    _validate_columns(df, target_column, sens_cols)

    # 5. Run bias engine
    try:
        metrics = await _compute_analysis_results(df, target_column, sens_cols, domain)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Bias computation failed: {str(e)}")

    analysis_id = new_analysis_id()
    try:
        save_successful_analysis(
            db,
            analysis_id=analysis_id,
            filename=file.filename,
            target_column=target_column,
            sensitive_columns=sens_cols,
            domain=domain,
            results=metrics,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not persist analysis: {str(e)}")

    return JSONResponse(content=jsonable_encoder({
        "status": "success",
        "analysis_id": analysis_id,
        "filename": file.filename,
        "target_column": target_column,
        "sensitive_columns": sens_cols,
        "domain": domain,
        "results": metrics
    }))


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

    sens_cols = _parse_sensitive_columns(sensitive_columns)
    _validate_columns(df, target_column, sens_cols)

    # Original analysis
    try:
        original_metrics = compute_bias_metrics(df.copy(), target_column, sens_cols)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Bias computation failed: {str(e)}")

    # Modified analysis
    df_modified = df.copy()
    df_modified[changed_feature] = df_modified[changed_feature].replace(original_value, new_value)
    try:
        modified_metrics = compute_bias_metrics(df_modified, target_column, sens_cols)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Bias computation failed: {str(e)}")

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
    return {"datasets": get_dataset_catalog()}


@router.get("/analyses")
def get_analyses(db: Session = Depends(get_db)):
    analyses = [analysis_summary(record) for record in list_analyses(db)]
    return {"analyses": analyses}


@router.get("/analyses/{analysis_id}")
def get_analysis(analysis_id: str, db: Session = Depends(get_db)):
    record = get_analysis_by_id(db, analysis_id)
    if not record:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return analysis_detail(record)

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
    sens_cols = _parse_sensitive_columns(sensitive_columns)
    _validate_columns(df, target_column, sens_cols)

    try:
        metrics = await _compute_analysis_results(df, target_column, sens_cols, domain)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Bias computation failed: {str(e)}")

    pdf_bytes = generate_pdf_report(metrics, file.filename, sens_cols, domain)
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=fairlens_report.pdf"}
    )
