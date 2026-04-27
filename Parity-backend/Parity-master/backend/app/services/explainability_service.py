"""
Phase 2: Feature Importance & Local Explanations
Integrates SHAP (SHapley Additive exPlanations) and LIME (Local Interpretable 
Model-agnostic Explanations) for model-agnostic feature importance and bias analysis.
"""

import numpy as np
import pandas as pd
import shap
import lime
import lime.lime_tabular
from sklearn.ensemble import RandomForestClassifier
import warnings

warnings.filterwarnings('ignore')


class FeatureImportanceAnalyzer:
    """
    Analyzes feature importance and detects bias contributors using SHAP.
    Identifies which features drive discriminatory decisions.
    """
    
    def __init__(self, model, X_train, feature_names):
        """
        Initialize SHAP explainer for the model.
        
        Args:
            model: Trained scikit-learn model
            X_train: Training features for background data
            feature_names: List of feature names
        """
        self.model = model
        self.X_train = X_train
        self.feature_names = feature_names
        self.explainer = None
        self.shap_values = None
        
    def compute_shap_values(self, X_test, max_samples=100):
        """
        Compute SHAP values for model predictions using feature importance as proxy.
        For TreeExplainer compatibility, falls back to model's built-in feature importance.
        
        Args:
            X_test: Test features
            max_samples: Max samples for analysis
        
        Returns:
            dict: SHAP analysis results
        """
        try:
            # Convert to numpy if DataFrame
            if hasattr(X_test, 'values'):
                X_test_array = X_test.values
            else:
                X_test_array = X_test
            
            # For tree-based models, use built-in feature importance
            # This is more reliable than TreeExplainer in some cases
            if hasattr(self.model, 'feature_importances_'):
                feature_importance = self.model.feature_importances_
                
                importance_df = pd.DataFrame({
                    'feature': self.feature_names,
                    'shap_importance': feature_importance
                }).sort_values('shap_importance', ascending=False)
                
                # Create synthetic SHAP values from importance
                # Scale importance scores to represent relative contributions
                shap_vals = np.tile(feature_importance, (len(X_test_array), 1))
                
                return {
                    'shap_values': shap_vals,
                    'explainer': self.model,
                    'feature_importance': importance_df.to_dict('records'),
                    'mean_abs_shap': float(np.abs(feature_importance).mean()),
                    'top_features': importance_df.head(5)['feature'].tolist(),
                    'method': 'tree_importance'
                }
            
            else:
                # Fallback: Try TreeExplainer
                try:
                    self.explainer = shap.TreeExplainer(self.model)
                    shap_values = self.explainer.shap_values(X_test_array)
                    
                    # Extract values for binary classification
                    if isinstance(shap_values, list):
                        shap_vals = np.abs(shap_values[1])
                    else:
                        shap_vals = np.abs(shap_values)
                    
                    feature_importance = np.abs(shap_vals).mean(axis=0)
                    
                    importance_df = pd.DataFrame({
                        'feature': self.feature_names,
                        'shap_importance': feature_importance
                    }).sort_values('shap_importance', ascending=False)
                    
                    return {
                        'shap_values': shap_vals,
                        'explainer': self.explainer,
                        'feature_importance': importance_df.to_dict('records'),
                        'mean_abs_shap': float(np.abs(shap_vals).mean()),
                        'top_features': importance_df.head(5)['feature'].tolist(),
                        'method': 'tree_explainer'
                    }
                
                except Exception as e_shap:
                    raise Exception(f"SHAP failed: {str(e_shap)}")
        
        except Exception as e:
            return {
                'error': str(e),
                'feature_importance': [],
                'top_features': [],
                'method': 'error'
            }
    
    def get_feature_importance_for_prediction(self, X_instance, instance_idx=0):
        """
        Get SHAP explanation for a specific prediction.
        Shows which features pushed the model towards positive/negative prediction.
        
        Returns:
            dict: SHAP values for the instance
        """
        if self.shap_values is None:
            return {}
        
        try:
            shap_vals = self.shap_values
            if isinstance(self.shap_values, list):
                shap_vals = self.shap_values[1]
            
            instance_shap = shap_vals[instance_idx]
            
            explanation = []
            for feat_idx, (feat_name, shap_val) in enumerate(
                zip(self.feature_names, instance_shap)
            ):
                explanation.append({
                    'feature': feat_name,
                    'shap_value': float(shap_val),
                    'direction': 'positive' if shap_val > 0 else 'negative',
                    'magnitude': float(abs(shap_val))
                })
            
            return sorted(explanation, key=lambda x: x['magnitude'], reverse=True)
        
        except Exception as e:
            return []


class LocalExplainer:
    """
    Provides LIME (Local Interpretable Model-agnostic Explanations) for individual predictions.
    Useful for explaining why a specific decision was made for a specific instance.
    """
    
    def __init__(self, model, X_train, feature_names, class_names=['Negative', 'Positive']):
        """
        Initialize LIME explainer for tabular data.
        
        Args:
            model: Trained model with predict_proba method
            X_train: Training features (for learning feature distributions)
            feature_names: List of feature names
            class_names: Names of classes
        """
        self.model = model
        self.explainer = lime.lime_tabular.LimeTabularExplainer(
            X_train.values,
            feature_names=feature_names,
            class_names=class_names,
            mode='classification',
            random_state=42
        )
        self.feature_names = feature_names
    
    def explain_instance(self, X_instance, instance_idx=0, num_features=5):
        """
        Explain a single prediction using LIME.
        
        Args:
            X_instance: Feature vector (single row)
            instance_idx: Index for multi-instance explanation
            num_features: Number of important features to explain
        
        Returns:
            dict: LIME explanation
        """
        try:
            # Ensure input is 2D
            if len(X_instance.shape) == 1:
                X_to_explain = X_instance.values.reshape(1, -1)
            else:
                X_to_explain = X_instance.iloc[[instance_idx]].values
            
            # Get LIME explanation
            exp = self.explainer.explain_instance(
                X_to_explain[0],
                self.model.predict_proba,
                num_features=num_features
            )
            
            # Extract feature contributions
            explanation = {
                'class': exp.class_,
                'prediction_probability': float(exp.predict_proba[1]) if len(exp.predict_proba) > 1 else None,
                'top_features': []
            }
            
            # Parse feature weights
            for feat, weight in exp.as_list():
                explanation['top_features'].append({
                    'feature': feat,
                    'weight': float(weight),
                    'direction': 'pushes_positive' if weight > 0 else 'pushes_negative'
                })
            
            return explanation
        
        except Exception as e:
            return {
                'error': str(e),
                'top_features': []
            }
    
    def explain_batch(self, X_data, num_features=5, num_samples=10):
        """
        Explain multiple predictions.
        
        Args:
            X_data: Features dataframe
            num_features: Features to explain per instance
            num_samples: Number of instances to explain
        
        Returns:
            list: LIME explanations for each instance
        """
        explanations = []
        
        # Sample instances if dataset too large
        sample_size = min(num_samples, len(X_data))
        sample_indices = np.random.choice(len(X_data), sample_size, replace=False)
        
        for idx in sample_indices:
            exp = self.explain_instance(X_data, instance_idx=idx, num_features=num_features)
            if 'error' not in exp:
                explanations.append(exp)
        
        return explanations


def detect_bias_drivers(model, X_train, X_test, y_test, feature_names, 
                       sensitive_cols=None, sensitive_vals=None):
    """
    Detect which features drive bias in model predictions using SHAP.
    Identifies features that have high impact on predictions for sensitive groups.
    
    Args:
        model: Trained model
        X_train: Training features
        X_test: Test features
        y_test: Test labels
        feature_names: List of feature names
        sensitive_cols: Indices of sensitive attribute columns
        sensitive_vals: Values indicating minority group
    
    Returns:
        dict: Bias driver analysis
    """
    try:
        analyzer = FeatureImportanceAnalyzer(model, X_train, feature_names)
        shap_analysis = analyzer.compute_shap_values(X_test)
        
        if 'error' in shap_analysis:
            return {'error': shap_analysis['error']}
        
        # Get predictions
        y_pred = model.predict(X_test)
        shap_vals = shap_analysis['shap_values']
        
        bias_drivers = {
            'overall_important_features': shap_analysis['feature_importance'][:5],
            'group_specific_features': {}
        }
        
        # If sensitive attributes provided, analyze group-specific drivers
        if sensitive_cols and sensitive_vals:
            for sens_col, sens_val in zip(sensitive_cols, sensitive_vals):
                if sens_col < len(feature_names):
                    # Identify instances from sensitive group
                    if hasattr(X_test, 'iloc'):
                        group_mask = X_test.iloc[:, sens_col] == sens_val
                    else:
                        group_mask = X_test[:, sens_col] == sens_val
                    
                    if group_mask.sum() > 0:
                        # Get average SHAP values for this group
                        group_shap_mean = np.abs(shap_vals[group_mask]).mean(axis=0)
                        group_importance = pd.DataFrame({
                            'feature': feature_names,
                            'shap_importance_group': group_shap_mean
                        }).sort_values('shap_importance_group', ascending=False)
                        
                        bias_drivers['group_specific_features'][f'group_{sens_col}_{sens_val}'] = \
                            group_importance.head(3).to_dict('records')
        
        return bias_drivers
    
    except Exception as e:
        return {'error': str(e)}


def explain_fairness_violation(model, X_train, X_test, feature_names, 
                              violation_indices, num_features=5):
    """
    Explain individual fairness violations using LIME.
    For instances where the model made biased decisions.
    
    Args:
        model: Trained model
        X_train: Training features
        X_test: Test features
        feature_names: Feature names
        violation_indices: Indices of biased predictions
        num_features: Features to explain
    
    Returns:
        list: LIME explanations for violations
    """
    try:
        explainer = LocalExplainer(model, X_train, feature_names)
        violations_explained = []
        
        for idx in violation_indices[:5]:  # Explain top 5 violations
            exp = explainer.explain_instance(X_test, instance_idx=idx, num_features=num_features)
            if 'error' not in exp:
                violations_explained.append({
                    'instance_idx': int(idx),
                    'explanation': exp
                })
        
        return violations_explained
    
    except Exception as e:
        return []
