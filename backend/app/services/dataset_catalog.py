from __future__ import annotations

import csv
from pathlib import Path


_DATASET_DEFINITIONS = [
    {
        "dataset_id": "adult-income",
        "name": "UCI Adult Income",
        "filename": "adult-income.csv",
        "description": "Census income prediction dataset for employment and income fairness checks.",
        "domain": "hiring",
        "suggested_target_column": "income_over_50k",
        "suggested_sensitive_columns": ["sex", "race"],
    },
    {
        "dataset_id": "compas-scores-two-years",
        "name": "COMPAS Recidivism",
        "filename": "compas-scores-two-years.csv",
        "description": "Criminal justice risk scoring dataset commonly used for bias audits.",
        "domain": "criminal_justice",
        "suggested_target_column": "two_year_recid",
        "suggested_sensitive_columns": ["race", "sex"],
    },
    {
        "dataset_id": "german-credit",
        "name": "German Credit",
        "filename": "german-credit.csv",
        "description": "Credit approval dataset for lending fairness analysis.",
        "domain": "lending",
        "suggested_target_column": "approved",
        "suggested_sensitive_columns": ["age_group", "foreign_worker"],
    },
    {
        "dataset_id": "heart-disease",
        "name": "Heart Disease Risk",
        "filename": "heart-disease.csv",
        "description": "Clinical risk prediction dataset for healthcare fairness checks.",
        "domain": "healthcare",
        "suggested_target_column": "high_risk",
        "suggested_sensitive_columns": ["sex", "age"],
    },
    {
        "dataset_id": "student-performance",
        "name": "Student Performance",
        "filename": "student-performance.csv",
        "description": "Education outcome dataset for opportunity and access analysis.",
        "domain": "education",
        "suggested_target_column": "passed",
        "suggested_sensitive_columns": ["socioeconomic_status"],
    },
    {
        "dataset_id": "resume-screening",
        "name": "Resume Screening",
        "filename": "resume-screening.csv",
        "description": "Synthetic hiring-screening dataset for interview selection fairness checks.",
        "domain": "hiring",
        "suggested_target_column": "interviewed",
        "suggested_sensitive_columns": ["gender", "ethnicity"],
    },
    {
        "dataset_id": "mortgage-approval",
        "name": "Mortgage Approval",
        "filename": "mortgage-approval.csv",
        "description": "Synthetic mortgage approval dataset with credit, income, and demographic attributes.",
        "domain": "lending",
        "suggested_target_column": "approved",
        "suggested_sensitive_columns": ["race", "age_band"],
    },
    {
        "dataset_id": "sepsis-triage",
        "name": "Sepsis Triage",
        "filename": "sepsis-triage.csv",
        "description": "Synthetic clinical triage dataset for high-priority care allocation audits.",
        "domain": "healthcare",
        "suggested_target_column": "high_priority",
        "suggested_sensitive_columns": ["sex", "race", "insurance_type"],
    },
    {
        "dataset_id": "scholarship-awards",
        "name": "Scholarship Awards",
        "filename": "scholarship-awards.csv",
        "description": "Synthetic education funding dataset for first-generation and income-band fairness analysis.",
        "domain": "education",
        "suggested_target_column": "awarded",
        "suggested_sensitive_columns": ["first_gen", "income_band"],
    },
    {
        "dataset_id": "fraud-review",
        "name": "Fraud Manual Review",
        "filename": "fraud-review.csv",
        "description": "Synthetic transaction-review dataset for operational fairness across regions and language groups.",
        "domain": "general",
        "suggested_target_column": "manual_review",
        "suggested_sensitive_columns": ["region", "language_group"],
    },
]


def _project_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _dataset_directories() -> list[Path]:
    project_root = _project_root()
    return [
        project_root / "public" / "datasets",
        project_root / "backend" / "datasets",
    ]


def _find_dataset_file(filename: str) -> Path | None:
    for directory in _dataset_directories():
        candidate = directory / filename
        if candidate.is_file():
            return candidate
    return None


def _read_columns(path: Path) -> list[str]:
    with path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.reader(handle)
        return next(reader, [])


def get_dataset_catalog() -> list[dict]:
    catalog = []
    for definition in _DATASET_DEFINITIONS:
        file_path = _find_dataset_file(definition["filename"])
        available_columns = _read_columns(file_path) if file_path else []
        catalog.append(
            {
                **definition,
                "download_url": f"/datasets/{definition['filename']}",
                "available_columns": available_columns,
                "metadata": {
                    "format": "csv",
                    "source": "public/datasets",
                    "column_count": len(available_columns),
                },
            }
        )
    return catalog
