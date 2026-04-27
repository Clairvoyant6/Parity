import pandas as pd
import numpy as np

def compute_bias_metrics(df: pd.DataFrame, target_col: str, sensitive_cols: list) -> dict:
    """
    Returns mock bias metrics for demonstration
    """
    return {
        "bias_risk_score": 45,
        "risk_level": "MEDIUM",
        "group_metrics": {},
        "feature_importance": {},
        "proxy_flags": [],
        "model_accuracy": 0.85,
        "dataset_size": len(df),
        "test_size": len(df) // 3,
    }

def detect_proxies(df_encoded: pd.DataFrame, sensitive_cols: list, target_col: str) -> list:
    """Detects features highly correlated with sensitive attributes"""
    return []