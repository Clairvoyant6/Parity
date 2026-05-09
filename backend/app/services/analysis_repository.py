from __future__ import annotations

import json
from typing import Any
from uuid import uuid4

from sqlalchemy.orm import Session

from app.models.analysis import Analysis


def _json_default(value: Any):
    if hasattr(value, "item"):
        return value.item()
    if hasattr(value, "isoformat"):
        return value.isoformat()
    raise TypeError(f"Object of type {type(value).__name__} is not JSON serializable")


def new_analysis_id() -> str:
    return uuid4().hex


def save_successful_analysis(
    db: Session,
    *,
    analysis_id: str,
    filename: str,
    target_column: str,
    sensitive_columns: list[str],
    domain: str,
    results: dict,
) -> Analysis:
    record = Analysis(
        analysis_id=analysis_id,
        filename=filename,
        target_column=target_column,
        sensitive_columns_json=json.dumps(sensitive_columns),
        domain=domain,
        bias_risk_score=results.get("bias_risk_score"),
        explanation=results.get("explanation"),
        metrics_json=json.dumps(results, default=_json_default),
    )
    db.add(record)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(record)
    return record


def list_analyses(db: Session) -> list[Analysis]:
    return (
        db.query(Analysis)
        .order_by(Analysis.created_at.desc(), Analysis.id.desc())
        .all()
    )


def get_analysis_by_id(db: Session, analysis_id: str) -> Analysis | None:
    return db.query(Analysis).filter(Analysis.analysis_id == analysis_id).one_or_none()


def _load_json(payload: str | None, default):
    if not payload:
        return default
    try:
        return json.loads(payload)
    except json.JSONDecodeError:
        return default


def analysis_summary(record: Analysis) -> dict:
    return {
        "analysis_id": record.analysis_id,
        "filename": record.filename,
        "target_column": record.target_column,
        "sensitive_columns": record.sensitive_columns,
        "domain": record.domain,
        "bias_risk_score": record.bias_risk_score,
        "created_at": record.created_at.isoformat() if record.created_at else None,
    }


def analysis_detail(record: Analysis) -> dict:
    return {
        **analysis_summary(record),
        "results": _load_json(record.metrics_json, {}),
        "explanation": record.explanation,
    }
