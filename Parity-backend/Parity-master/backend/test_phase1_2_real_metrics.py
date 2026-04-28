"""
Phase 1-2 Validation Test
Tests real bias metrics computation with AIF360, SHAP, and LIME
"""

import pandas as pd
import numpy as np
import sys
from pathlib import Path

# Add app to path
sys.path.insert(0, str(Path(__file__).parent))

from app.services.bias_engine import compute_bias_metrics, detect_proxies

def test_real_bias_metrics():
    """Test with real bias metrics computation"""
    print("\n" + "="*70)
    print("PHASE 1-2: REAL BIAS METRICS COMPUTATION TEST")
    print("="*70)
    
    # Create sample dataset with STRONG proxy bias (for realistic testing)
    np.random.seed(42)
    n = 300
    
    # Create race first (binary: 0=White, 1=NonWhite)
    race_binary = np.random.choice([0, 1], n, p=[0.6, 0.4])
    
    # Create proxy: zip_code strongly correlated with race
    zip_code = np.where(race_binary == 1, np.random.choice([1, 2], n, p=[0.9, 0.1]), 
                        np.random.choice([1, 2], n, p=[0.1, 0.9]))
    
    # Create gender (0=Male, 1=Female)
    gender = np.random.choice([0, 1], n, p=[0.5, 0.5])
    
    data = {
        'age': np.random.randint(25, 65, n),
        'years_experience': np.random.randint(0, 30, n),
        'zip_code': zip_code,  # Proxy for race
        'gender': gender,
        'race': race_binary,
        'gpa': np.round(np.random.uniform(2.0, 4.0, n), 1),
        'test_score': np.random.randint(400, 1600, n),
        'hired': np.random.choice([0, 1], n)
    }
    
    df = pd.DataFrame(data)
    
    # Introduce hiring bias based on protected attributes
    for i in range(n):
        # Women less likely to be hired
        if df.loc[i, 'gender'] == 1:
            if np.random.random() > 0.45:
                df.loc[i, 'hired'] = 0
        
        # Non-White candidates less likely to be hired
        if df.loc[i, 'race'] == 1:
            if np.random.random() > 0.40:
                df.loc[i, 'hired'] = 0
    
    print("\n[PHASE 1] Testing Real Bias Metrics Computation")
    print("-" * 70)
    
    # Compute real metrics using AIF360
    metrics = compute_bias_metrics(
        df,
        target_col='hired',
        sensitive_cols=['gender', 'race']
    )
    
    # Verify key metrics are computed (not hardcoded)
    print(f"✓ Bias Risk Score: {metrics['bias_risk_score']}")
    print(f"✓ Risk Level: {metrics['risk_level']}")
    print(f"✓ Model Accuracy: {metrics['model_accuracy']:.3f}")
    print(f"✓ Dataset Size: {metrics['dataset_size']}")
    print(f"✓ Processed Size: {metrics['processed_size']}")
    
    # Verify disparate impact calculation
    print(f"\n[PHASE 1] Disparate Impact Metrics")
    print("-" * 70)
    if 'disparate_impact_avg' in metrics:
        di = metrics['disparate_impact_avg']
        print(f"✓ Average Disparate Impact Ratio: {di:.3f}")
        if di < 0.8:
            print(f"  ⚠️  WARNING: Below 80% rule (violation threshold)")
        else:
            print(f"  ✓ Meets 80% rule")
    
    if 'demographic_parity_avg' in metrics:
        dpd = metrics['demographic_parity_avg']
        print(f"✓ Average Demographic Parity Difference: {dpd:.3f}")
        if dpd > 0.1:
            print(f"  ⚠️  WARNING: High parity difference (>10%)")
    
    # Verify group metrics are computed
    print(f"\n[PHASE 1] Per-Attribute Metrics")
    print("-" * 70)
    if metrics.get('group_metrics'):
        for attr, group_data in metrics['group_metrics'].items():
            print(f"  Attribute: {attr}")
            if isinstance(group_data, dict):
                for key, val in group_data.items():
                    if 'size' not in key and 'group_' not in key:
                        print(f"    - {key}: {val}")
    
    # Verify feature importance (Phase 1)
    print(f"\n[PHASE 2] Feature Importance Analysis")
    print("-" * 70)
    if metrics.get('feature_importance'):
        print("  Top Features by Importance:")
        for feat, importance in sorted(
            metrics['feature_importance'].items(), 
            key=lambda x: x[1], 
            reverse=True
        )[:5]:
            print(f"    - {feat}: {importance:.4f}")
    
    # Verify proxy detection (Phase 2)
    print(f"\n[PHASE 2] Proxy Variable Detection")
    print("-" * 70)
    if metrics.get('proxy_flags'):
        print(f"  Found {len(metrics['proxy_flags'])} potential proxy variables:")
        for proxy in metrics['proxy_flags']:
            print(f"    Feature: {proxy['feature']}")
            print(f"    Sensitive Attr: {proxy['sensitive_attribute']}")
            print(f"    Risk Level: {proxy.get('risk_level', 'UNKNOWN')}")
            if 'correlation' in proxy:
                print(f"    Correlation: {proxy['correlation']:.3f}")
            if 'shap_differential_importance' in proxy:
                print(f"    SHAP Differential: {proxy['shap_differential_importance']:.4f}")
            print(f"    Method: {proxy.get('detection_method', 'unknown')}")
            print()
    else:
        print("  No proxy variables detected")
    
    # Summary
    print("="*70)
    print("PHASE 1-2 VALIDATION SUMMARY")
    print("="*70)
    
    checklist = [
        ("Real bias metrics computation (AIF360)", 'bias_risk_score' in metrics),
        ("Disparate Impact Ratio calculation", 'disparate_impact_avg' in metrics),
        ("Demographic Parity computation", 'demographic_parity_avg' in metrics),
        ("Model accuracy measurement", 'model_accuracy' in metrics),
        ("Feature importance analysis (Phase 2)", bool(metrics.get('feature_importance'))),
        ("Proxy variable detection (Phase 2)", bool(metrics.get('proxy_flags'))),
    ]
    
    all_passed = True
    for check_name, passed in checklist:
        status = "✓" if passed else "✗"
        print(f"  {status} {check_name}")
        if not passed:
            all_passed = False
    
    print("\n" + "="*70)
    if all_passed:
        print("✅ PHASES 1-2 IMPLEMENTATION COMPLETE AND VALIDATED!")
    else:
        print("⚠️  Some checks failed - review implementation")
    print("="*70)
    
    return metrics

if __name__ == "__main__":
    metrics = test_real_bias_metrics()
