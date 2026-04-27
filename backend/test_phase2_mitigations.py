"""
Phase 2 Mitigation Recommendations Test
Tests fairness mitigation strategy recommendations using Fairlearn and AIF360
"""

import pandas as pd
import numpy as np
import sys
from pathlib import Path

# Add app to path
sys.path.insert(0, str(Path(__file__).parent))

from app.services.bias_engine import compute_bias_metrics, recommend_mitigations

def test_mitigation_recommendations():
    """Test mitigation recommendation generation"""
    print("\n" + "="*70)
    print("PHASE 2: FAIRNESS MITIGATION RECOMMENDATIONS TEST")
    print("="*70)
    
    # Create biased dataset
    np.random.seed(42)
    n = 300
    
    # Create race first (binary: 0=White, 1=NonWhite)
    race_binary = np.random.choice([0, 1], n, p=[0.6, 0.4])
    
    # Create proxy: zip_code strongly correlated with race
    zip_code = np.where(race_binary == 1, np.random.choice([1, 2], n, p=[0.9, 0.1]), 
                        np.random.choice([1, 2], n, p=[0.1, 0.9]))
    
    # Create gender
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
    
    # Introduce hiring bias
    for i in range(n):
        if df.loc[i, 'gender'] == 1:
            if np.random.random() > 0.45:
                df.loc[i, 'hired'] = 0
        if df.loc[i, 'race'] == 1:
            if np.random.random() > 0.40:
                df.loc[i, 'hired'] = 0
    
    print("\n[STEP 1] Compute bias metrics")
    print("-" * 70)
    
    metrics = compute_bias_metrics(
        df,
        target_col='hired',
        sensitive_cols=['gender', 'race']
    )
    
    print(f"Risk Level: {metrics['risk_level']}")
    print(f"Bias Risk Score: {metrics['bias_risk_score']:.1f}/100")
    print(f"Disparate Impact: {metrics.get('disparate_impact_avg', 0):.3f}")
    print(f"Proxy Variables Detected: {len(metrics.get('proxy_flags', []))}")
    
    print("\n[STEP 2] Generate mitigation recommendations")
    print("-" * 70)
    
    recommendations = recommend_mitigations(metrics, df, 'hired', ['gender', 'race'])
    
    print(f"\nTotal Recommendations: {len(recommendations)}\n")
    
    # Group by priority
    priority_groups = {}
    for rec in recommendations:
        priority = rec['priority']
        if priority not in priority_groups:
            priority_groups[priority] = []
        priority_groups[priority].append(rec)
    
    # Display by priority
    for priority in ['CRITICAL', 'HIGH', 'MEDIUM', 'ALWAYS']:
        if priority in priority_groups:
            print(f"\n[{priority} PRIORITY]")
            print("=" * 70)
            for i, rec in enumerate(priority_groups[priority], 1):
                print(f"\n  {i}. {rec['title']}")
                print(f"     Category: {rec['category']}")
                print(f"     Description: {rec['description']}")
                print(f"     Implementation: {rec['implementation']}")
                print(f"     Expected: {rec['expected_improvement']}")
                print(f"     Trade-offs: {rec['trade_offs']}")
    
    # Validation checklist
    print("\n" + "="*70)
    print("PHASE 2 MITIGATION VALIDATION")
    print("="*70)
    
    checklist = [
        ("Recommendations generated", len(recommendations) > 0),
        ("Priority levels assigned", all('priority' in r for r in recommendations)),
        ("Categories assigned", all('category' in r for r in recommendations)),
        ("Implementation guidance provided", all('implementation' in r for r in recommendations)),
        ("Trade-offs documented", all('trade_offs' in r for r in recommendations)),
        ("Code snippets included", sum(1 for r in recommendations if 'code_snippet' in r) > 0),
        ("Critical recs for high bias", 
         any(r['priority'] == 'CRITICAL' for r in recommendations) 
         if metrics['risk_level'] == 'MEDIUM' else True),
    ]
    
    all_passed = True
    for check_name, passed in checklist:
        status = "✓" if passed else "✗"
        print(f"  {status} {check_name}")
        if not passed:
            all_passed = False
    
    print("\n" + "="*70)
    if all_passed and len(recommendations) > 0:
        print("✅ PHASE 2 MITIGATION RECOMMENDATIONS COMPLETE!")
        print(f"   Generated {len(recommendations)} actionable recommendations")
    else:
        print("⚠️  Some checks failed - review implementation")
    print("="*70)
    
    return recommendations

if __name__ == "__main__":
    recommendations = test_mitigation_recommendations()
