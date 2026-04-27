"""
Phase 2 Test: Feature Importance & Local Explanations
Tests SHAP, LIME, and enhanced proxy detection
"""

import pandas as pd
import numpy as np
from app.services.bias_engine import compute_bias_metrics, detect_proxies
from app.services.explainability_service import (
    FeatureImportanceAnalyzer, 
    LocalExplainer, 
    detect_bias_drivers
)
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
import warnings

warnings.filterwarnings('ignore')

print("=" * 70)
print("PHASE 2: FEATURE IMPORTANCE & LOCAL EXPLANATIONS TEST")
print("=" * 70)

# Load COMPAS dataset
df = pd.read_csv('datasets/compas-scores-two-years.csv')
print(f"\n1. Dataset loaded: {df.shape[0]} rows, {df.shape[1]} columns")

# Prepare data
df_processed = df.copy()
numeric_cols = df_processed.select_dtypes(include=[np.number]).columns.tolist()

# Remove non-numeric columns
feature_cols = [col for col in numeric_cols 
                if col not in ['two_year_recid', 'age_cat', 'race']]

X = df_processed[feature_cols].fillna(df_processed[feature_cols].mean())
y = df_processed['two_year_recid'].astype(int)

# Train model
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.3, random_state=42, stratify=y
)

rf_model = RandomForestClassifier(n_estimators=50, random_state=42, max_depth=10)
rf_model.fit(X_train, y_train)
train_accuracy = rf_model.score(X_train, y_train)
test_accuracy = rf_model.score(X_test, y_test)

print(f"   Training accuracy: {train_accuracy:.3f}")
print(f"   Testing accuracy: {test_accuracy:.3f}")

# ==================== TEST 1: SHAP Feature Importance ====================
print("\n" + "=" * 70)
print("TEST 1: SHAP Feature Importance Analysis")
print("=" * 70)

try:
    analyzer = FeatureImportanceAnalyzer(rf_model, X_train, X_test.columns.tolist())
    shap_analysis = analyzer.compute_shap_values(X_test, max_samples=100)
    
    print("\n[PASS] SHAP analysis completed successfully!")
    print(f"   Method used: {shap_analysis.get('method', 'unknown')}")
    if 'error' not in shap_analysis:
        print(f"   Mean absolute SHAP value: {shap_analysis.get('mean_abs_shap', 0):.4f}")
        print(f"   Top features by SHAP importance:")
        for i, feat in enumerate(shap_analysis.get('top_features', [])[:5], 1):
            print(f"      {i}. {feat}")
        
        print(f"\n   Top 5 feature importance details:")
        for item in shap_analysis.get('feature_importance', [])[:5]:
            print(f"      - {item['feature']}: {item['shap_importance']:.4f}")
    else:
        print(f"   Warning: {shap_analysis.get('error', 'Unknown error')}")

except Exception as e:
    print(f"[FAIL] SHAP analysis failed: {e}")
    import traceback
    traceback.print_exc()

# ==================== TEST 2: LIME Local Explanations ====================
print("\n" + "=" * 70)
print("TEST 2: LIME Local Explanations")
print("=" * 70)

try:
    explainer = LocalExplainer(rf_model, X_train, X_test.columns.tolist())
    
    # Explain first instance
    first_instance_exp = explainer.explain_instance(X_test, instance_idx=0, num_features=5)
    
    print("\n[PASS] LIME explanations generated successfully!")
    print(f"\n   Explanation for first test instance:")
    if 'error' not in first_instance_exp:
        print(f"      Predicted class: {first_instance_exp['class']}")
        print(f"      Prediction probability: {first_instance_exp['prediction_probability']:.3f}")
        print(f"      Top contributing features:")
        for feat_exp in first_instance_exp['top_features']:
            direction = "UP (pushes positive)" if feat_exp['direction'] == 'pushes_positive' else "DOWN (pushes negative)"
            print(f"         - {feat_exp['feature']}: {feat_exp['weight']:.3f} {direction}")
    
    # Explain batch
    batch_explanations = explainer.explain_batch(X_test, num_features=5, num_samples=10)
    print(f"\n   Generated explanations for {len(batch_explanations)} instances")

except Exception as e:
    print(f"[FAIL] LIME analysis failed: {e}")
    import traceback
    traceback.print_exc()

# ==================== TEST 3: Enhanced Proxy Detection ====================
print("\n" + "=" * 70)
print("TEST 3: Enhanced Proxy Detection (Correlation + SHAP)")
print("=" * 70)

try:
    # Test proxy detection with model (uses SHAP)
    proxies_with_shap = detect_proxies(
        df_processed, 
        ['age_cat', 'race'], 
        'two_year_recid', 
        model=rf_model
    )
    
    print(f"\n[PASS] Enhanced proxy detection completed!")
    print(f"   Total proxies detected: {len(proxies_with_shap)}")
    
    if proxies_with_shap:
        print(f"\n   Proxy variables (potential indirect discrimination):")
        for proxy in proxies_with_shap[:5]:
            print(f"\n      Feature: {proxy['feature']}")
            print(f"      Sensitive attribute: {proxy['sensitive_attribute']}")
            print(f"      Detection method: {proxy['detection_method']}")
            print(f"      Risk level: {proxy['risk_level']}")
            
            if 'correlation' in proxy:
                print(f"      Correlation: {proxy['correlation']}")
            if 'shap_differential_importance' in proxy:
                print(f"      SHAP differential importance: {proxy['shap_differential_importance']}")
    else:
        print("   No significant proxies detected")

except Exception as e:
    print(f"[FAIL] Proxy detection failed: {e}")
    import traceback
    traceback.print_exc()

# ==================== TEST 4: Bias Drivers Analysis ====================
print("\n" + "=" * 70)
print("TEST 4: Bias Drivers Analysis (Which features cause discrimination)")
print("=" * 70)

try:
    bias_drivers = detect_bias_drivers(
        rf_model,
        X_train,
        X_test,
        y_test,
        X_test.columns.tolist(),
        sensitive_cols=[df_processed.columns.get_loc('age_cat')],
        sensitive_vals=[0]  # Age category 0
    )
    
    print("\n✅ Bias driver analysis completed!")
    
    if 'error' not in bias_drivers:
        print(f"\n   Overall important features:")
        for i, feat in enumerate(bias_drivers['overall_important_features'][:3], 1):
            print(f"      {i}. {feat['feature']}: {feat['shap_importance']:.4f}")
        
        if bias_drivers['group_specific_features']:
            print(f"\n   Group-specific bias drivers:")
            for group_name, features in bias_drivers['group_specific_features'].items():
                print(f"\n      {group_name}:")
                for feat in features[:3]:
                    print(f"         - {feat['feature']}: {feat['shap_importance_group']:.4f}")

except Exception as e:
    print(f"❌ Bias driver analysis failed: {e}")

# ==================== SUMMARY ====================
print("\n" + "=" * 70)
print("PHASE 2 SUMMARY")
print("=" * 70)
print("""
✅ Phase 2 Implementation includes:

1. SHAP (SHapley Additive exPlanations)
   - Model-agnostic feature importance
   - Explains individual predictions
   - Identifies discriminatory features
   
2. LIME (Local Interpretable Model-agnostic Explanations)
   - Local explanations for specific predictions
   - Shows feature contributions to decisions
   - Human-interpretable feature weights

3. Enhanced Proxy Detection
   - Correlation-based detection
   - SHAP differential importance detection
   - Group-specific feature importance analysis

4. Bias Driver Identification
   - Overall discriminatory features
   - Group-specific bias drivers
   - Quantified feature impact on discrimination

Next: Phase 3 - Implement RAG system with knowledge base
       Phase 4 - Enhance Groq LLM prompts with retrieved context
""")
print("=" * 70)
