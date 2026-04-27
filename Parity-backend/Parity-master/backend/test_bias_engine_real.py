import pandas as pd
from app.services.bias_engine import compute_bias_metrics
import warnings
import json

warnings.filterwarnings('ignore')

# Load COMPAS dataset
df = pd.read_csv('datasets/compas-scores-two-years.csv')
print('Dataset shape:', df.shape)
print('Columns:', df.columns.tolist()[:10], '...')
print()

# Compute bias metrics using age-cat and race as sensitive attributes
try:
    metrics = compute_bias_metrics(df, 'two_year_recid', ['age_cat', 'race'])
    
    print('=== BIAS METRICS RESULTS ===')
    print(f'Bias Risk Score: {metrics["bias_risk_score"]}/100')
    print(f'Risk Level: {metrics["risk_level"]}')
    print(f'Model Accuracy: {metrics["model_accuracy"]}')
    print(f'Disparate Impact Avg: {metrics["disparate_impact_avg"]}')
    print(f'Demographic Parity Avg: {metrics["demographic_parity_avg"]}')
    print(f'Dataset Size: {metrics["dataset_size"]}')
    print(f'Processed Size: {metrics["processed_size"]}')
    
    print('\n=== GROUP METRICS ===')
    for attr, data in metrics['group_metrics'].items():
        print(f'\n{attr}:')
        for key, value in list(data.items())[:6]:
            print(f'  {key}: {value}')
    
    print('\n=== PROXY FLAGS (Indirect Discrimination) ===')
    if metrics['proxy_flags']:
        for proxy in metrics['proxy_flags']:
            print(f'  - Feature: {proxy["feature"]}')
            print(f'    Sensitive Attr: {proxy["sensitive_attribute"]}')
            print(f'    Correlation: {proxy["correlation"]}')
            print(f'    Risk Level: {proxy["risk_level"]}')
    else:
        print('  No major proxy variables detected')
    
    print('\n=== FEATURE IMPORTANCE (Top 5) ===')
    for feat, imp in list(metrics['feature_importance'].items())[:5]:
        print(f'  {feat}: {imp}')
    
    print('\n✅ REAL AIF360 BIAS METRICS SUCCESSFULLY COMPUTED!')
    print('\n📊 KEY FINDINGS:')
    if metrics["disparate_impact_avg"] < 0.8:
        print('  ⚠️  DISPARATE IMPACT VIOLATION (< 0.8) - Potential discrimination detected')
    if metrics["demographic_parity_avg"] > 0.1:
        print('  ⚠️  DEMOGRAPHIC PARITY DIFFERENCE > 0.1 - Significant group differences')
    print(f'  📈 Model is {metrics["model_accuracy"]*100:.1f}% accurate on protected groups')
    
except Exception as e:
    print(f'❌ Error: {e}')
    import traceback
    traceback.print_exc()

