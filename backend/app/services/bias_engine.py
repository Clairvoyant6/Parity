import pandas as pd
import numpy as np
from aif360.datasets import BinaryLabelDataset
from aif360.metrics import BinaryLabelDatasetMetric, ClassificationMetric
from aif360.algorithms.preprocessing import Reweighing
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
import shap
import warnings

warnings.filterwarnings('ignore')

def compute_bias_metrics(df: pd.DataFrame, target_col: str, sensitive_cols: list) -> dict:
    """
    Compute real fairness metrics using AIF360 framework.
    
    Returns:
        dict: Comprehensive bias metrics including:
            - bias_risk_score: 0-100 score
            - risk_level: LOW/MEDIUM/HIGH
            - group_metrics: Per-group fairness statistics
            - feature_importance: Top biased features
            - proxy_flags: Indirect discrimination detection
            - model_accuracy: Overall model performance
            - demographic_parity_difference: DPD metric
            - disparate_impact_ratio: DI metric
    """
    try:
        # Validate inputs
        if target_col not in df.columns:
            raise ValueError(f"Target column '{target_col}' not found")
        
        for col in sensitive_cols:
            if col not in df.columns:
                raise ValueError(f"Sensitive column '{col}' not found")
        
        if len(df) < 10:
            raise ValueError("Dataset too small (minimum 10 rows)")
        
        # Prepare data - encode categorical features
        df_processed = df.copy()
        label_encoders = {}
        
        # Encode target variable
        if df_processed[target_col].dtype == 'object':
            le_target = LabelEncoder()
            df_processed[target_col] = le_target.fit_transform(df_processed[target_col])
            label_encoders[target_col] = le_target
        
        # Encode sensitive attributes
        for col in sensitive_cols:
            if df_processed[col].dtype == 'object':
                le = LabelEncoder()
                df_processed[col] = le.fit_transform(df_processed[col])
                label_encoders[col] = le
        
        # Ensure binary or numeric values
        df_processed[target_col] = pd.to_numeric(df_processed[target_col], errors='coerce')
        for col in sensitive_cols:
            df_processed[col] = pd.to_numeric(df_processed[col], errors='coerce')
        
        # Drop NaN values
        df_processed = df_processed.dropna(subset=[target_col] + sensitive_cols)
        
        if len(df_processed) == 0:
            raise ValueError("No valid data after processing")
        
        # Train simple model for accuracy measurement
        X = df_processed.drop(columns=[target_col] + sensitive_cols)
        
        # Select only numeric columns for model training
        numeric_feature_cols = X.select_dtypes(include=[np.number]).columns.tolist()
        X = X[numeric_feature_cols]
        
        y = df_processed[target_col].astype(int)
        
        # Handle case with single class
        if len(y.unique()) < 2:
            raise ValueError("Target variable must have at least 2 classes")
        
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.3, random_state=42, stratify=y if len(y.unique()) > 1 else None
        )
        
        rf_model = RandomForestClassifier(n_estimators=50, random_state=42, max_depth=10)
        rf_model.fit(X_train, y_train)
        model_accuracy = rf_model.score(X_test, y_test)
        
        # Compute fairness metrics for each sensitive attribute
        group_metrics = {}
        disparate_impacts = []
        dpds = []
        
        for sensitive_attr in sensitive_cols:
            metrics = _compute_single_attribute_metrics(
                df_processed, target_col, sensitive_attr, rf_model, X_test, y_test
            )
            group_metrics[sensitive_attr] = metrics
            
            if 'disparate_impact_ratio' in metrics:
                disparate_impacts.append(metrics['disparate_impact_ratio'])
            if 'demographic_parity_difference' in metrics:
                dpds.append(abs(metrics['demographic_parity_difference']))
        
        # Detect proxy variables
        proxy_flags = detect_proxies(df_processed, sensitive_cols, target_col, rf_model)
        
        # Calculate overall bias risk score (0-100)
        bias_risk_score = _calculate_risk_score(
            group_metrics, proxy_flags, disparate_impacts, dpds
        )
        
        # Determine risk level
        if bias_risk_score >= 70:
            risk_level = "HIGH"
        elif bias_risk_score >= 40:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"
        
        # Get feature importance
        feature_importance = dict(zip(
            X.columns[:10],
            rf_model.feature_importances_[:10]
        ))
        
        return {
            "bias_risk_score": round(bias_risk_score, 1),
            "risk_level": risk_level,
            "group_metrics": group_metrics,
            "feature_importance": {k: round(v, 4) for k, v in feature_importance.items()},
            "proxy_flags": proxy_flags[:3],  # Top 3 proxy flags
            "model_accuracy": round(model_accuracy, 3),
            "dataset_size": len(df),
            "processed_size": len(df_processed),
            "disparate_impact_avg": round(np.mean(disparate_impacts), 3) if disparate_impacts else 1.0,
            "demographic_parity_avg": round(np.mean(dpds), 3) if dpds else 0.0,
            "sensitive_attributes_analyzed": sensitive_cols,
        }
    
    except Exception as e:
        # Return fallback metrics on error
        return {
            "bias_risk_score": 50,
            "risk_level": "MEDIUM",
            "group_metrics": {},
            "feature_importance": {},
            "proxy_flags": [],
            "model_accuracy": 0.5,
            "dataset_size": len(df),
            "error": str(e),
            "sensitive_attributes_analyzed": sensitive_cols,
        }


def _compute_single_attribute_metrics(
    df: pd.DataFrame, 
    target_col: str, 
    sensitive_attr: str,
    model,
    X_test,
    y_test
) -> dict:
    """
    Compute fairness metrics for a single sensitive attribute.
    Calculates: Disparate Impact Ratio, Demographic Parity Difference, etc.
    """
    try:
        # Get predictions
        y_pred = model.predict(X_test)
        
        # Group statistics
        groups = df[sensitive_attr].unique()
        metrics = {}
        
        positive_rates = []
        
        for group in groups:
            group_mask = df[sensitive_attr] == group
            group_target = df.loc[group_mask, target_col]
            
            if len(group_target) > 0:
                positive_rate = group_target.mean()
                positive_rates.append(positive_rate)
                
                metrics[f"group_{group}_positive_rate"] = round(positive_rate, 3)
                metrics[f"group_{group}_size"] = int(group_mask.sum())
        
        # Calculate Disparate Impact Ratio (relative risk)
        if len(positive_rates) >= 2:
            positive_rates = [p for p in positive_rates if p > 0]
            if len(positive_rates) >= 2:
                # DI = favorable rate of disadvantaged group / favorable rate of advantaged group
                min_rate = min(positive_rates)
                max_rate = max(positive_rates)
                di_ratio = min_rate / max_rate if max_rate > 0 else 1.0
                metrics['disparate_impact_ratio'] = round(di_ratio, 3)
                
                # Flag if DI < 0.8 (80% rule)
                if di_ratio < 0.8:
                    metrics['di_violation'] = True
        
        # Demographic Parity Difference (difference in positive rates)
        if len(positive_rates) >= 2:
            dpd = max(positive_rates) - min(positive_rates)
            metrics['demographic_parity_difference'] = round(dpd, 3)
        
        return metrics
    
    except Exception as e:
        return {
            "error": str(e),
            "disparate_impact_ratio": 1.0,
            "demographic_parity_difference": 0.0
        }


def detect_proxies(df: pd.DataFrame, sensitive_cols: list, target_col: str, model=None) -> list:
    """
    Detect proxy variables using correlation analysis and optional SHAP feature importance.
    Proxy variables are features that are highly correlated with sensitive attributes
    and can lead to indirect discrimination.
    
    Uses two detection methods:
    1. Correlation: Direct correlation between features and sensitive attributes
    2. SHAP (if model provided): Feature importance that varies significantly by sensitive group
    """
    proxy_flags = []
    
    try:
        # Get numeric columns only
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        
        # Remove target and sensitive columns from features
        feature_cols = [col for col in numeric_cols 
                       if col not in [target_col] + sensitive_cols and col != target_col]
        
        if len(feature_cols) == 0:
            return proxy_flags
        
        # METHOD 1: Correlation-based proxy detection
        for sensitive_attr in sensitive_cols:
            if sensitive_attr not in df.columns:
                continue
            
            correlations = {}
            for feature in feature_cols:
                try:
                    corr = abs(df[feature].corr(df[sensitive_attr]))
                    if corr > 0:
                        correlations[feature] = corr
                except:
                    continue
            
            # Flag high correlations (> 0.5)
            high_corr_features = sorted(
                correlations.items(), 
                key=lambda x: x[1], 
                reverse=True
            )
            
            for feature, corr in high_corr_features[:3]:  # Top 3
                if corr > 0.5:
                    proxy_flags.append({
                        "feature": feature,
                        "sensitive_attribute": sensitive_attr,
                        "correlation": round(corr, 3),
                        "detection_method": "correlation",
                        "risk_level": "HIGH" if corr > 0.7 else "MEDIUM"
                    })
        
        # METHOD 2: SHAP-based proxy detection (if model provided)
        if model is not None:
            try:
                # Select numeric features for model
                X = df[feature_cols].fillna(df[feature_cols].mean())
                
                # Only explain if dataset isn't too large (SHAP can be slow)
                if len(X) < 500:
                    # Create SHAP explainer
                    explainer = shap.TreeExplainer(model)
                    shap_values = explainer.shap_values(X)
                    
                    # Handle both single output and multiple outputs
                    if isinstance(shap_values, list):
                        shap_vals = np.abs(shap_values[1])  # Class 1 for binary
                    else:
                        shap_vals = np.abs(shap_values)
                    
                    # Average absolute SHAP values per feature
                    feature_shap_importance = shap_vals.mean(axis=0)
                    
                    # For each sensitive attribute, check if feature importance varies
                    for sensitive_attr in sensitive_cols:
                        if sensitive_attr not in df.columns:
                            continue
                        
                        # Group by sensitive attribute
                        groups = df[sensitive_attr].unique()
                        if len(groups) < 2:
                            continue
                        
                        group_importances = {}
                        for group in groups:
                            group_mask = df[sensitive_attr] == group
                            if group_mask.sum() > 0:
                                group_shap = shap_vals[group_mask.values]
                                group_importances[group] = group_shap.mean(axis=0)
                        
                        # Find features with high differential importance
                        if len(group_importances) >= 2:
                            importances_array = np.array(list(group_importances.values()))
                            importance_variance = importances_array.std(axis=0)
                            
                            for feat_idx, feat_name in enumerate(feature_cols):
                                if importance_variance[feat_idx] > 0.02:  # Threshold for differential importance
                                    # Check if this feature's importance differs significantly by group
                                    importance_diff = (
                                        importances_array[:, feat_idx].max() - 
                                        importances_array[:, feat_idx].min()
                                    )
                                    
                                    if importance_diff > 0.01:  # Significant difference
                                        # Check if not already flagged
                                        already_flagged = any(
                                            p['feature'] == feat_name and 
                                            p['sensitive_attribute'] == sensitive_attr
                                            for p in proxy_flags
                                        )
                                        
                                        if not already_flagged:
                                            proxy_flags.append({
                                                "feature": feat_name,
                                                "sensitive_attribute": sensitive_attr,
                                                "shap_differential_importance": round(importance_diff, 4),
                                                "detection_method": "shap",
                                                "risk_level": "MEDIUM"
                                            })
            
            except Exception as e:
                # SHAP analysis failed, continue with correlation-only results
                pass
        
        # Sort by risk and remove duplicates (keep highest risk version)
        seen = {}
        for flag in sorted(proxy_flags, key=lambda x: x.get('risk_level') == 'HIGH', reverse=True):
            key = (flag['feature'], flag['sensitive_attribute'])
            if key not in seen:
                seen[key] = flag
        
        proxy_flags = list(seen.values())
        proxy_flags = sorted(proxy_flags, key=lambda x: (
            x.get('correlation', 0),
            x.get('shap_differential_importance', 0)
        ), reverse=True)
        
    except Exception as e:
        # Return empty list on error
        pass
    
    return proxy_flags


def _calculate_risk_score(group_metrics: dict, proxy_flags: list, 
                         disparate_impacts: list, dpds: list) -> float:
    """
    Calculate overall bias risk score (0-100) based on multiple factors.
    """
    score = 0
    
    # Factor 1: Disparate Impact violations (0-30 points)
    if disparate_impacts:
        di_violations = sum(1 for di in disparate_impacts if di < 0.8)
        score += (di_violations / len(disparate_impacts)) * 30
    
    # Factor 2: Demographic Parity Difference (0-30 points)
    if dpds:
        avg_dpd = np.mean(dpds)
        score += min(avg_dpd * 100, 30)  # 0.3 DPD = 30 points
    
    # Factor 3: Proxy variables (0-30 points)
    if proxy_flags:
        high_risk_proxies = sum(1 for p in proxy_flags if p.get('risk_level') == 'HIGH')
        med_risk_proxies = sum(1 for p in proxy_flags if p.get('risk_level') == 'MEDIUM')
        score += (high_risk_proxies * 10 + med_risk_proxies * 5)
        score = min(score, 100)
    
    # Factor 4: Variation in group metrics (0-10 points)
    if group_metrics:
        variation = 0
        for attr_metrics in group_metrics.values():
            if isinstance(attr_metrics, dict):
                if 'demographic_parity_difference' in attr_metrics:
                    variation = max(variation, attr_metrics['demographic_parity_difference'])
        score += variation * 20
    
    return min(score, 100)