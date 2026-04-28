# Phase 1-2: Real Fairness Metrics & Mitigation Strategies

**Status**: ✅ COMPLETED  
**Date**: Current Session  
**Test Results**: 100% (all tests passing)

---

## Overview

Phases 1-2 implement the core fairness analysis engine using real statistical bias metrics from AIF360 and SHAP, along with actionable mitigation recommendations from Fairlearn and AIF360.

### Key Achievements

- ✅ Real bias metrics computation (not hardcoded)
- ✅ Disparate Impact Ratio (80% rule) enforcement  
- ✅ Demographic Parity Difference calculation
- ✅ Feature importance analysis (RandomForest + SHAP)
- ✅ Proxy variable detection (correlation + SHAP differential)
- ✅ Fairness mitigation recommendations (Fairlearn + AIF360)
- ✅ Model accuracy measurement
- ✅ Risk scoring (0-100) with categorical levels (LOW/MEDIUM/HIGH)

---

## Phase 1: Bias Metrics Computation

### Implemented Metrics

#### 1. **Disparate Impact Ratio (DI)**
- **Definition**: Selection rate for protected group / selection rate for majority group
- **Threshold**: < 0.8 = violation (EEOC 80% rule)
- **Implementation**: AIF360's `BinaryLabelDatasetMetric` 
- **Example**: If 60% of women are hired but 90% of men are, DI = 60/90 = 0.67 (violation)

#### 2. **Demographic Parity Difference (DPD)**
- **Definition**: Absolute difference in selection rates between groups
- **Threshold**: > 10% = significant difference
- **Implementation**: AIF360 metrics computation
- **Example**: If women have 60% hire rate and men 90%, DPD = |60-90| = 30%

#### 3. **Group Metrics Per Attribute**
For each sensitive attribute (gender, race, etc.):
- Sample count per group
- Selection rate per group
- DI ratio per group
- DPD per group
- Violation flags (boolean)

#### 4. **Model Accuracy**
- Overall classification accuracy on test set
- Computed using scikit-learn's accuracy_score
- Independent of fairness metrics (for comparison)

### Risk Score Calculation (0-100)

```
score = 0
score += (DI violations / total groups) × 30        # Factor 1: DI violations
score += min(avg_DPD × 100, 30)                    # Factor 2: DPD magnitude
score += (high_proxies × 10 + med_proxies × 5)    # Factor 3: Proxy variables
score += variation × 20                             # Factor 4: Variation
score = min(score, 100)
```

**Risk Levels**:
- **LOW**: 0-33 points
- **MEDIUM**: 34-66 points
- **HIGH**: 67-100 points

---

## Phase 2: Proxy Detection & Mitigation

### Proxy Variable Detection

Proxies are features that correlate with protected attributes and can recreate discrimination indirectly.

#### Detection Methods

**Method 1: Correlation Analysis**
```python
correlation = abs(feature_values.corr(sensitive_attribute))
if correlation > 0.5:
    proxy_flag = {
        'feature': feature_name,
        'sensitive_attribute': attribute,
        'correlation': correlation,
        'detection_method': 'correlation',
        'risk_level': 'HIGH' if correlation > 0.7 else 'MEDIUM'
    }
```

**Method 2: SHAP Differential Importance**
- Trains model twice: with sensitive attribute included, then excluded
- Compares feature importance differences
- High SHAP differential = proxy behavior

#### Risk Levels
- **HIGH**: Correlation > 0.7 OR SHAP differential > 0.15
- **MEDIUM**: Correlation 0.5-0.7 OR SHAP differential 0.10-0.15
- **LOW**: Below thresholds

### Feature Importance Analysis

Uses RandomForest + SHAP for interpretability:
- **Random Forest Feature Importance**: Mean decrease in impurity
- **SHAP Feature Importance**: Average |SHAP value| per feature
- Helps identify which features drive the predictions
- Essential for proxy variable detection

---

## Phase 2: Mitigation Recommendations

Based on detected bias patterns, the system recommends prioritized mitigation strategies.

### Recommendation Priorities

#### **CRITICAL** (For HIGH risk or DI violations)
1. **Address Disparate Impact (80% Rule)**
   - Category: Model Retraining
   - Implementation: AIF360 + Fairlearn combined approach
   - Expected: DI > 0.8 (legal compliance)
   - Trade-offs: Requires retraining and validation

#### **HIGH** (For MEDIUM/HIGH risk)
1. **Add Fairness Constraints**
   - Category: In-processing
   - Implementation: `fairlearn.reductions.ExponentiatedGradient`
   - Constraints: DemographicParity, EqualizedOdds, etc.
   - Expected: Reduces bias while maintaining accuracy
   
2. **Remove Proxy Variables**
   - Category: Feature Engineering
   - Remove or decorrelate high-risk proxies
   - Expected: 30-50% reduction in proxy discrimination

3. **Apply Data Reweighting**
   - Category: Pre-processing
   - Implementation: `aif360.algorithms.preprocessing.Reweighing`
   - Balances training samples across groups
   - Expected: Reduces DI violations by 20-40%

4. **Optimize Decision Thresholds**
   - Category: Post-processing
   - Implementation: `fairlearn.postprocessing.ThresholdOptimizer`
   - Different thresholds per demographic group
   - Expected: Reduces DPD to < 5%

#### **ALWAYS** (Governance)
1. **Implement Fairness Monitoring**
   - Continuous tracking of metrics in production
   - Detects bias drift early
   - No trade-offs (always recommended)

---

## Implementation Details

### File: `backend/app/services/bias_engine.py`

#### Function: `compute_bias_metrics()`
```python
def compute_bias_metrics(df, target_col, sensitive_cols) -> dict:
    """
    Compute real fairness metrics using AIF360.
    
    Returns:
    {
        'bias_risk_score': float (0-100),
        'risk_level': 'LOW'|'MEDIUM'|'HIGH',
        'model_accuracy': float,
        'dataset_size': int,
        'processed_size': int,
        'disparate_impact_avg': float,
        'demographic_parity_avg': float,
        'group_metrics': {
            'gender': {
                'disparate_impact_ratio': float,
                'di_violation': bool,
                'demographic_parity_difference': float,
                ...
            }
        },
        'feature_importance': {
            'feature_name': float,
            ...
        },
        'proxy_flags': [
            {
                'feature': str,
                'sensitive_attribute': str,
                'risk_level': 'HIGH'|'MEDIUM',
                'correlation': float,
                'detection_method': 'correlation'|'shap',
                ...
            }
        ]
    }
    """
```

#### Function: `recommend_mitigations()`
```python
def recommend_mitigations(metrics, df, target_col, sensitive_cols) -> list:
    """
    Generate actionable mitigation recommendations.
    
    Returns list of recommendations:
    [
        {
            'priority': 'CRITICAL'|'HIGH'|'MEDIUM'|'ALWAYS',
            'category': 'Pre-processing'|'In-processing'|'Post-processing'|'Feature Engineering'|'Governance',
            'title': str,
            'description': str,
            'implementation': str,
            'expected_improvement': str,
            'code_snippet': str,
            'trade_offs': str
        }
    ]
    """
```

### Dependencies

```
aif360>=0.5.0                    # Fairness metrics & mitigation algorithms
fairlearn>=0.10.0               # Microsoft fairness library
shap>=0.42.0                    # Feature importance & proxy detection
scikit-learn>=1.3.0             # RandomForest model training
pandas>=1.5.0                   # Data manipulation
numpy>=1.24.0                   # Numerical computing
```

---

## Test Results

### Test 1: `test_phase1_2_real_metrics.py`

**Status**: ✅ PASSED (6/6 checks)

```
✓ Real bias metrics computation (AIF360)
✓ Disparate Impact Ratio calculation
✓ Demographic Parity computation
✓ Model accuracy measurement
✓ Feature importance analysis (Phase 2)
✓ Proxy variable detection (Phase 2)
```

**Example Output**:
```
Bias Risk Score: 60.2
Risk Level: MEDIUM
Average Disparate Impact Ratio: 0.497
  ⚠️  WARNING: Below 80% rule (violation threshold)
Average Demographic Parity Difference: 0.164
  ⚠️  WARNING: High parity difference (>10%)

Per-Attribute Metrics:
  Gender: DI=0.45 (violation), DPD=0.19
  Race: DI=0.543 (violation), DPD=0.137

Feature Importance:
  1. test_score: 0.3498
  2. age: 0.2044
  3. gpa: 0.2042
  4. years_experience: 0.1990
  5. zip_code: 0.0427

Proxy Variables Detected: 1
  Feature: zip_code
  Sensitive Attr: race
  Risk Level: HIGH
  Correlation: 0.788
  Method: correlation
```

### Test 2: `test_phase2_mitigations.py`

**Status**: ✅ PASSED (7/7 checks)

```
✓ Recommendations generated
✓ Priority levels assigned
✓ Categories assigned
✓ Implementation guidance provided
✓ Trade-offs documented
✓ Code snippets included
✓ Critical recs for high bias
```

**Example Output**:
```
Risk Level: MEDIUM, Score: 60.2/100

CRITICAL PRIORITY (1 rec):
  1. Address Disparate Impact (80% Rule Violation)

HIGH PRIORITY (3 recs):
  1. Add Fairness Constraints to Model Training
  2. Remove Proxy Variables
  3. Remove Detected Proxies (1 features): zip_code

ALWAYS PRIORITY (1 rec):
  1. Implement Fairness Monitoring

Total: 5 actionable recommendations
```

---

## Integration with Other Phases

### Phase 3-5 (RAG Explanations)

The bias metrics from Phase 1-2 feed into Phase 3-5:

1. **Risk Level** → Determines RAG query strategy
2. **Proxy Flags** → Retrieved in knowledge base (e.g., "proxy discrimination")
3. **Feature Importance** → Included in explanations
4. **Group Metrics** → Context for fairness assessment
5. **Mitigation Recs** → Sourced from knowledge base

### API Endpoint Integration

The `/analyze` endpoint now returns:
```json
{
    "bias_risk_score": 60.2,
    "risk_level": "MEDIUM",
    "group_metrics": {...},
    "feature_importance": {...},
    "proxy_flags": [...],
    "explanation": "Multi-sentence explanation with context...",
    "citations": [
        "EEOC Guidance on 80% Rule: ...",
        "AIF360 Disparate Impact Definition: ...",
        "Proxy Discrimination Examples: ..."
    ],
    "sources": [...],
    "mitigation_recommendations": [
        {
            "priority": "CRITICAL",
            "title": "Address Disparate Impact...",
            ...
        }
    ]
}
```

---

## Lessons Learned

### What Worked Well
1. **AIF360 Integration**: Stable, comprehensive metrics
2. **SHAP for Proxies**: Effective at detecting indirect discrimination
3. **Risk Scoring System**: Clear communication of bias severity
4. **Recommendation Prioritization**: Helps organizations focus on critical issues

### Challenges & Solutions
1. **Correlation Thresholds**: Needed tuning for different domains
   - Solution: Made configurable (0.5 default, can adjust)

2. **Proxy Detection Sensitivity**: Too aggressive = false positives
   - Solution: Dual-method approach (correlation + SHAP)

3. **Feature Importance Interpretability**: Needs multiple methods
   - Solution: RandomForest importance + SHAP values

### Best Practices
- Always validate metrics on test set (not training set)
- Consider business context when interpreting DI < 0.8
- Document proxy features and reason for removal
- Monitor mitigation strategies over time

---

## Future Enhancements

### Phase 2+ Roadmap

1. **Intersectionality Analysis**
   - Analyze bias at intersection of multiple attributes (gender + race)
   - Use AIF360's intersectional metrics

2. **Causal Fairness**
   - Use causal inference to distinguish correlation from causation in proxies
   - Implement DoWhy library integration

3. **Fairness-Accuracy Tradeoff Analysis**
   - Pareto frontier showing different mitigation strategies
   - Help organizations choose trade-offs

4. **Constraint-Based Optimization**
   - ExponentiatedGradient with custom constraints
   - Multiple fairness criteria simultaneously

5. **Temporal Fairness**
   - Monitor fairness drift over time
   - Detect concept drift in protected attributes

6. **Individual Fairness**
   - Ensure similar individuals get similar decisions
   - Counterfactual fairness analysis

---

## Validation Checklist

- ✅ Real metrics (AIF360) not hardcoded
- ✅ Disparate Impact computation correct
- ✅ Demographic Parity Difference correct
- ✅ Feature importance working (RandomForest + SHAP)
- ✅ Proxy detection dual-method approach
- ✅ Risk score calculation validated
- ✅ Mitigation recommendations comprehensive
- ✅ All tests passing
- ✅ Code well-documented
- ✅ Integration with Phases 3-5 verified

---

## References

### Academic Papers
1. Hardt, M., Price, E., & Srebro, N. (2016). "Equality of Opportunity in Supervised Learning"
2. Bolukbasi, T., Chang, K., Zou, J. Y., et al. (2016). "Man is to Computer Programmer as Woman is to Homemaker?"
3. Obermeyer, Z., Powers, B., Vogeli, C., & Mullainathan, S. (2019). "Dissecting racial bias in an algorithm used to manage the health of populations"

### Tools & Libraries
1. IBM AIF360: https://aif360.readthedocs.io/
2. Microsoft Fairlearn: https://fairlearn.org/
3. SHAP: https://shap.readthedocs.io/
4. ProPublica COMPAS Analysis: https://github.com/propublica/compas-analysis/

### Legal References
1. EEOC Guidance on 80% Rule: https://www.eeoc.gov/guidance/question-answer-page
2. Title VII Civil Rights Act (employment discrimination)
3. Fair Housing Act (housing discrimination)

---

**Phase 1-2 Implementation**: Complete ✅  
**Integrated with Phases 3-5**: Yes ✅  
**Ready for Production**: Pending load testing
