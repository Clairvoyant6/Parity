import pandas as pd
import numpy as np
from pandas.api.types import is_numeric_dtype
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
import warnings

warnings.filterwarnings('ignore')

def compute_bias_metrics(df: pd.DataFrame, target_col: str, sensitive_cols: list) -> dict:
    """
    Compute model-output fairness metrics with a deterministic baseline model.
    
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

    # Encode target variable
    if not is_numeric_dtype(df_processed[target_col]):
        le_target = LabelEncoder()
        df_processed[target_col] = le_target.fit_transform(df_processed[target_col])

    # Encode sensitive attributes
    for col in sensitive_cols:
        if not is_numeric_dtype(df_processed[col]):
            le = LabelEncoder()
            df_processed[col] = le.fit_transform(df_processed[col])

    # Ensure binary or numeric values
    df_processed[target_col] = pd.to_numeric(df_processed[target_col], errors='coerce')
    for col in sensitive_cols:
        df_processed[col] = pd.to_numeric(df_processed[col], errors='coerce')

    # Drop NaN values
    df_processed = df_processed.dropna(subset=[target_col] + sensitive_cols)

    if len(df_processed) == 0:
        raise ValueError("No valid data after processing")

    # Train simple model for accuracy measurement
    feature_frame = df_processed.drop(columns=[target_col] + sensitive_cols)
    if feature_frame.empty:
        raise ValueError("No usable feature columns remain after removing target and sensitive columns")

    # Encode categorical features so we can compute predictions on the full dataset.
    X = pd.get_dummies(feature_frame, dummy_na=True)
    if X.shape[1] == 0:
        raise ValueError("No usable feature columns remain after encoding")

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

    y_pred_full = pd.Series(rf_model.predict(X), index=df_processed.index)

    # Compute fairness metrics for each sensitive attribute
    group_metrics = {}
    disparate_impacts = []
    dpds = []
    equalized_odds_values = []
    predictive_parity_values = []

    for sensitive_attr in sensitive_cols:
        metrics = _compute_single_attribute_metrics(
            df_processed, target_col, sensitive_attr, y_pred_full
        )
        group_metrics[sensitive_attr] = metrics

        if 'disparate_impact_ratio' in metrics:
            disparate_impacts.append(metrics['disparate_impact_ratio'])
        if 'demographic_parity_difference' in metrics:
            dpds.append(abs(metrics['demographic_parity_difference']))
        if 'equalized_odds' in metrics:
            equalized_odds_values.append(metrics['equalized_odds'])
        if 'predictive_parity' in metrics:
            predictive_parity_values.append(metrics['predictive_parity'])

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

    equalized_odds = _aggregate_equalized_odds(equalized_odds_values)
    predictive_parity = _aggregate_predictive_parity(predictive_parity_values)

    disparate_impact_avg = round(np.mean(disparate_impacts), 3) if disparate_impacts else 1.0
    demographic_parity_avg = round(np.mean(dpds), 3) if dpds else 0.0

    return _normalize_metric_keys({
        "bias_risk_score": round(bias_risk_score, 1),
        "risk_level": risk_level,
        "group_metrics": group_metrics,
        "feature_importance": {k: round(v, 4) for k, v in feature_importance.items()},
        "proxy_flags": proxy_flags[:3],  # Top 3 proxy flags
        "model_accuracy": round(model_accuracy, 3),
        "dataset_size": len(df),
        "processed_size": len(df_processed),
        "disparate_impact_avg": disparate_impact_avg,
        "demographic_parity_avg": demographic_parity_avg,
        "sensitive_attributes_analyzed": sensitive_cols,
        "disparate_impact_ratio": disparate_impact_avg,
        "demographic_parity_difference": demographic_parity_avg,
        "equalized_odds": equalized_odds,
        "predictive_parity": predictive_parity,
    })


def _compute_single_attribute_metrics(
    df: pd.DataFrame, 
    target_col: str, 
    sensitive_attr: str,
    y_pred_full: pd.Series
) -> dict:
    """
    Compute fairness metrics for a single sensitive attribute.
    Calculates: Disparate Impact Ratio, Demographic Parity Difference, etc.
    """
    # Group statistics
    groups = [group for group in df[sensitive_attr].dropna().unique().tolist()]
    metrics = {
        "groups": {},
    }

    group_prediction_rates = []
    group_actual_rates = []
    group_tpr = []
    group_fpr = []
    group_precision = []

    for group in groups:
        group_mask = df[sensitive_attr] == group
        group_df = df.loc[group_mask, [target_col]]
        if group_mask.sum() == 0:
            continue

        y_true_group = df.loc[group_mask, target_col].astype(int)
        y_pred_group = y_pred_full.loc[group_mask].astype(int)

        prediction_rate = float(y_pred_group.mean()) if len(y_pred_group) else 0.0
        actual_rate = float(y_true_group.mean()) if len(y_true_group) else 0.0

        tp = int(((y_pred_group == 1) & (y_true_group == 1)).sum())
        fp = int(((y_pred_group == 1) & (y_true_group == 0)).sum())
        tn = int(((y_pred_group == 0) & (y_true_group == 0)).sum())
        fn = int(((y_pred_group == 0) & (y_true_group == 1)).sum())

        tpr = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        fpr = fp / (fp + tn) if (fp + tn) > 0 else 0.0
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0

        group_prediction_rates.append(prediction_rate)
        group_actual_rates.append(actual_rate)
        group_tpr.append(tpr)
        group_fpr.append(fpr)
        group_precision.append(precision)

        metrics["groups"][str(group)] = {
            "count": int(group_mask.sum()),
            "prediction_rate": round(prediction_rate, 3),
            "positive_rate": round(prediction_rate, 3),  # legacy alias for report consumers
            "actual_positive_rate": round(actual_rate, 3),
            "true_positive_rate": round(tpr, 3),
            "false_positive_rate": round(fpr, 3),
            "predictive_parity": round(precision, 3),
        }

    if len(group_prediction_rates) >= 2:
        min_rate = min(group_prediction_rates)
        max_rate = max(group_prediction_rates)
        di_ratio = min_rate / max_rate if max_rate > 0 else 1.0
        dpd = max_rate - min_rate
        metrics['disparate_impact_ratio'] = round(di_ratio, 3)
        metrics['demographic_parity_difference'] = round(dpd, 3)
        metrics['disparate_impact'] = round(di_ratio, 3)
        metrics['demographic_parity'] = round(dpd, 3)
        if di_ratio < 0.8:
            metrics['di_violation'] = True
    else:
        metrics['disparate_impact_ratio'] = 1.0
        metrics['demographic_parity_difference'] = 0.0
        metrics['disparate_impact'] = 1.0
        metrics['demographic_parity'] = 0.0

    metrics['equalized_odds'] = {
        "true_positive_rate_difference": round(max(group_tpr) - min(group_tpr), 3) if len(group_tpr) >= 2 else 0.0,
        "false_positive_rate_difference": round(max(group_fpr) - min(group_fpr), 3) if len(group_fpr) >= 2 else 0.0,
    }
    metrics['predictive_parity'] = {
        "positive_predictive_value_difference": round(max(group_precision) - min(group_precision), 3) if len(group_precision) >= 2 else 0.0,
    }

    return metrics


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
                import shap

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

        for flag in proxy_flags:
            flag.setdefault('correlation', 0.0)
            flag.setdefault('shap_differential_importance', 0.0)
            flag.setdefault(
                'warning',
                f"{flag.get('feature', 'Unknown feature')} correlates with {flag.get('sensitive_attribute', 'a sensitive attribute')}"
            )
        
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


def _aggregate_equalized_odds(values: list) -> dict:
    if not values:
        return {
            "true_positive_rate_difference": 0.0,
            "false_positive_rate_difference": 0.0,
        }

    tpr_diffs = [v.get("true_positive_rate_difference", 0.0) for v in values]
    fpr_diffs = [v.get("false_positive_rate_difference", 0.0) for v in values]
    return {
        "true_positive_rate_difference": round(float(np.mean(tpr_diffs)), 3),
        "false_positive_rate_difference": round(float(np.mean(fpr_diffs)), 3),
    }


def _aggregate_predictive_parity(values: list) -> dict:
    if not values:
        return {
            "positive_predictive_value_difference": 0.0,
        }

    diffs = [v.get("positive_predictive_value_difference", 0.0) for v in values]
    return {
        "positive_predictive_value_difference": round(float(np.mean(diffs)), 3),
    }


def _normalize_metric_keys(metrics: dict) -> dict:
    normalized = dict(metrics)

    # Top-level aliases for legacy and normalized consumers.
    normalized.setdefault("disparate_impact_ratio", normalized.get("disparate_impact_avg", 1.0))
    normalized.setdefault("demographic_parity_difference", normalized.get("demographic_parity_avg", 0.0))
    normalized.setdefault("disparate_impact", normalized["disparate_impact_ratio"])
    normalized.setdefault("demographic_parity", normalized["demographic_parity_difference"])

    if "equalized_odds" not in normalized:
        normalized["equalized_odds"] = {
            "true_positive_rate_difference": 0.0,
            "false_positive_rate_difference": 0.0,
        }

    if "predictive_parity" not in normalized:
        normalized["predictive_parity"] = {
            "positive_predictive_value_difference": 0.0,
        }

    # Keep per-group metrics accessible through the normalized keys too.
    group_metrics = normalized.get("group_metrics", {})
    for attr_metrics in group_metrics.values():
        if isinstance(attr_metrics, dict):
            attr_metrics.setdefault("disparate_impact_ratio", attr_metrics.get("disparate_impact", 1.0))
            attr_metrics.setdefault("demographic_parity_difference", attr_metrics.get("demographic_parity", 0.0))
            attr_metrics.setdefault("equalized_odds", {
                "true_positive_rate_difference": 0.0,
                "false_positive_rate_difference": 0.0,
            })
            attr_metrics.setdefault("predictive_parity", {
                "positive_predictive_value_difference": 0.0,
            })

    return normalized


def recommend_mitigations(metrics: dict, df: pd.DataFrame, 
                         target_col: str, sensitive_cols: list) -> list:
    """
    PHASE 2: Recommend fairness mitigation strategies based on detected bias.
    Uses Fairlearn and AIF360 best practices.
    
    Args:
        metrics: Bias metrics from compute_bias_metrics()
        df: Original dataset
        target_col: Target column name
        sensitive_cols: List of sensitive attributes
    
    Returns:
        List of mitigation recommendations with priority and implementation guide
    """
    recommendations = []
    risk_level = metrics.get('risk_level', 'UNKNOWN')
    
    # HIGH RISK: Implement aggressive mitigation
    if risk_level == 'HIGH':
        # Recommendation 1: Data reweighting (AIF360 Reweighing)
        recommendations.append({
            'priority': 'CRITICAL',
            'category': 'Pre-processing',
            'title': 'Apply Data Reweighting',
            'description': 'Use AIF360 Reweighing algorithm to balance training samples across groups.',
            'implementation': 'aif360.algorithms.preprocessing.Reweighing',
            'expected_improvement': 'Reduces disparate impact by 20-40%',
            'code_snippet': """
from aif360.algorithms.preprocessing import Reweighing
rw = Reweighing(unprivileged_groups=[{sensitive_attr: 0}],
                 privileged_groups=[{sensitive_attr: 1}])
dataset_transf = rw.fit_transform(dataset)
            """,
            'trade_offs': 'May slightly reduce overall accuracy'
        })
        
        # Recommendation 2: Threshold optimization (Fairlearn)
        recommendations.append({
            'priority': 'CRITICAL',
            'category': 'Post-processing',
            'title': 'Optimize Decision Thresholds',
            'description': 'Adjust prediction thresholds per demographic group to achieve demographic parity.',
            'implementation': 'fairlearn.postprocessing.ThresholdOptimizer',
            'expected_improvement': 'Reduces demographic parity difference to <5%',
            'code_snippet': """
from fairlearn.postprocessing import ThresholdOptimizer
threshold_opt = ThresholdOptimizer(
    estimator=model,
    constraints='demographic_parity'
)
threshold_opt.fit(X_train, y_train, sensitive_features=sensitive_train)
            """,
            'trade_offs': 'Different thresholds per group may seem unfair to individuals'
        })
    
    # MEDIUM RISK: Implement moderate mitigation
    elif risk_level == 'MEDIUM':
        recommendations.append({
            'priority': 'HIGH',
            'category': 'In-processing',
            'title': 'Add Fairness Constraints to Model Training',
            'description': 'Train model with fairness constraints using Fairlearn or AIF360.',
            'implementation': 'fairlearn.reductions.ExponentiatedGradient',
            'expected_improvement': 'Reduces bias while maintaining accuracy',
            'code_snippet': """
from fairlearn.reductions import ExponentiatedGradient, DemographicParity
constraint = DemographicParity(difference_bound=0.1)
mitigator = ExponentiatedGradient(estimator, constraints=constraint)
mitigator.fit(X_train, y_train, sensitive_features=sensitive_train)
            """,
            'trade_offs': 'Requires model retraining, may reduce accuracy'
        })
        
        recommendations.append({
            'priority': 'HIGH',
            'category': 'Feature Engineering',
            'title': 'Remove Proxy Variables',
            'description': 'Remove or transform features that proxy for protected attributes.',
            'implementation': 'Feature selection and engineering',
            'expected_improvement': 'Eliminates indirect discrimination',
            'code_snippet': """
# Remove high-correlation proxy features
df_mitigated = df.drop(columns=['proxy_feature'])

# Or: Use low-correlation transformations
df_mitigated['transformed'] = apply_fairness_transform(df['proxy_feature'])
            """,
            'trade_offs': 'May lose predictive information'
        })
    
    # LOW RISK: Monitoring and documentation
    if risk_level in ['LOW', 'MEDIUM', 'HIGH']:
        recommendations.append({
            'priority': 'ALWAYS',
            'category': 'Governance',
            'title': 'Implement Fairness Monitoring',
            'description': 'Monitor fairness metrics continuously in production.',
            'implementation': 'Custom monitoring pipeline',
            'expected_improvement': 'Detects bias drift early',
            'code_snippet': """
# Monitor fairness metrics quarterly
for sensitive_attr in sensitive_cols:
    di = compute_disparate_impact(predictions, protected=sensitive_attr)
    if di < 0.8:
        alert_management('Disparate Impact violation detected')
            """,
            'trade_offs': 'None - always recommended'
        })
    
    # Check for specific proxy issues
    if metrics.get('proxy_flags'):
        proxy_count = len(metrics['proxy_flags'])
        proxy_features = ', '.join([p['feature'] for p in metrics.get('proxy_flags', [])][:3])
        recommendations.append({
            'priority': 'HIGH',
            'category': 'Feature Engineering',
            'title': f"Remove Detected Proxies ({proxy_count} features)",
            'description': f"The following features correlate with protected attributes: {proxy_features}",
            'implementation': 'Feature removal or decorrelation',
            'expected_improvement': '30-50% reduction in proxy discrimination',
            'code_snippet': """
# Remove proxy variables
proxy_features = ['zip_code', 'address']  # Examples
df_clean = df.drop(columns=proxy_features)
            """,
            'trade_offs': 'May reduce model interpretability'
        })
    
    # Check for high disparate impact
    if metrics.get('disparate_impact_avg', 1.0) < 0.8:
        recommendations.append({
            'priority': 'CRITICAL',
            'category': 'Model Retraining',
            'title': 'Address Disparate Impact (80% Rule Violation)',
            'description': 'Current DI ratio violates the 80% rule. Implement mitigation immediately.',
            'implementation': 'AIF360 + Fairlearn combined approach',
            'expected_improvement': 'DI > 0.8 (legal compliance)',
            'code_snippet': """
# Implement two-step mitigation
# Step 1: Reweight training data
df_reweighted = apply_reweighting(df, protected=sensitive_cols)

# Step 2: Retrain with fairness constraints
model = train_fair_model(df_reweighted, constraints='demographic_parity')
            """,
            'trade_offs': 'Requires retraining and validation'
        })
    
    # Sort by priority (CRITICAL > HIGH > MEDIUM > ALWAYS)
    priority_order = {'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'ALWAYS': 3}
    recommendations = sorted(recommendations, 
                             key=lambda x: priority_order.get(x['priority'], 99))
    
    return recommendations
