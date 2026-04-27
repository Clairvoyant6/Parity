"""
FairLens Knowledge Base - Curated fairness documentation and best practices
Sources: Obermeyer et al., ProPublica COMPAS analysis, NIST AI RMF, EU AI Act, AIF360
"""

from dataclasses import dataclass
from typing import List, Dict, Optional


@dataclass
class KnowledgeEntry:
    """A single knowledge base entry with metadata"""
    id: str
    title: str
    content: str
    source: str
    category: str
    tags: List[str]
    relevance_keywords: List[str]


class FairnessKnowledgeBase:
    """Curated knowledge base for fairness explanations"""
    
    def __init__(self):
        self.entries = self._initialize_knowledge_base()
    
    def _initialize_knowledge_base(self) -> List[KnowledgeEntry]:
        """Initialize with curated fairness knowledge"""
        return [
            # DISPARATE IMPACT
            KnowledgeEntry(
                id="di_001",
                title="Disparate Impact Rule",
                content="""Disparate impact refers to policies or decisions that appear neutral 
but have a disproportionate negative effect on members of a protected group. Under the 80% 
rule (Four-Fifths Rule), adverse impact exists if the selection rate for any race, sex, or 
ethnic group is less than 80% of the rate for the group with the highest selection rate.

Example: If a hiring algorithm selects 80% of male candidates but only 60% of female candidates,
this represents disparate impact (60/80 = 75%, below the 80% threshold).""",
                source="EEOC (Equal Employment Opportunity Commission) Guidelines",
                category="Fairness Metrics",
                tags=["disparate_impact", "hiring", "discrimination", "protected_groups"],
                relevance_keywords=["disparate", "impact", "80%", "selection", "protected"]
            ),
            
            # DEMOGRAPHIC PARITY
            KnowledgeEntry(
                id="dp_001",
                title="Demographic Parity",
                content="""Demographic parity (also called statistical parity) requires that 
a decision-making system provides equal outcomes across demographic groups. A model achieves 
demographic parity when P(ŷ=1|A=a) = P(ŷ=1|A=b) for different values of sensitive attribute A.

This means the positive prediction rate should be the same for all groups. Demographic parity 
difference is the absolute difference in positive prediction rates between groups. A difference 
near 0 indicates better fairness.

Limitation: Demographic parity can conflict with other fairness definitions and may be inappropriate 
when the base rates differ between groups.""",
                source="Calmon et al. (2017), AIF360 Documentation",
                category="Fairness Metrics",
                tags=["demographic_parity", "equal_outcomes", "prediction_rates"],
                relevance_keywords=["demographic", "parity", "equal", "outcome", "prediction"]
            ),
            
            # COMPAS BIAS
            KnowledgeEntry(
                id="compas_001",
                title="ProPublica COMPAS Analysis - Racial Bias in Criminal Risk Assessment",
                content="""ProPublica's investigation of COMPAS (Correctional Offender Management 
Profiling for Alternative Sanctions) revealed significant racial bias in criminal risk scores.

Key Findings:
- African-American defendants were marked as future criminals at twice the rate of white defendants
- White defendants labeled as future criminals were actually less likely to reoffend
- COMPAS flagged African Americans at nearly twice the rate (45% vs 23%)
- Equalized odds fairness metric was violated: false positive rates differed significantly

Impact: This landmark 2016 study revealed how algorithmic bias in criminal justice systems 
can perpetuate systemic racism and inequality.""",
                source="ProPublica (2016) - Machine Bias",
                category="Case Studies",
                tags=["compas", "criminal_justice", "racial_bias", "false_positives"],
                relevance_keywords=["compas", "criminal", "racial", "bias", "false"]
            ),
            
            # HEALTHCARE BIAS
            KnowledgeEntry(
                id="obermeyer_001",
                title="Obermeyer et al. - Healthcare AI Bias",
                content="""Obermeyer et al. (2019) identified racial bias in a widely used 
algorithm that managed care for millions of high-risk patients. The algorithm used historical 
medical costs to allocate health care resources.

Problem: The algorithm used medical spending as a proxy for health status, which systematically 
disadvantaged Black patients who had lower medical spending due to historical inequities in 
healthcare access.

Key Insight: Algorithmic bias isn't always intentional. Even well-designed algorithms can embed 
societal biases when trained on biased historical data. This is a "proxy discrimination" problem 
where one variable (medical spending) correlates with but doesn't properly measure what we care 
about (health status).

Recommendation: When historical data is biased, consider alternative targets or fairness constraints 
to prevent perpetuating historical inequities.""",
                source="Obermeyer et al. (2019) - Nature Medicine",
                category="Case Studies",
                tags=["healthcare", "proxy_discrimination", "disparities", "medical_bias"],
                relevance_keywords=["healthcare", "proxy", "medical", "cost", "health"]
            ),
            
            # PROXY DISCRIMINATION
            KnowledgeEntry(
                id="proxy_001",
                title="Proxy Discrimination and Redlining",
                content="""Proxy discrimination occurs when a system uses features that are 
not protected by law but serve as a proxy for protected characteristics. The system may 
never explicitly see the sensitive attribute, but correlated features leak this information.

Historical Example: Redlining in housing was implemented using ZIP codes, loan amounts, and 
property values rather than explicitly stating race restrictions. Yet the ZIP codes perfectly 
predicted Black neighborhoods.

Modern Example: In hiring, the algorithm may use ZIP code, high school, or college name as 
features. These correlate with race, enabling discrimination without explicitly using race.

Detection: Correlation analysis (using SHAP or LIME) can identify when non-sensitive features 
are highly correlated with protected attributes, indicating potential proxy discrimination.""",
                source="LIME & SHAP Interpretability Literature",
                category="Fairness Concepts",
                tags=["proxy_discrimination", "redlining", "correlation", "feature_selection"],
                relevance_keywords=["proxy", "redline", "correlated", "hidden", "protected"]
            ),
            
            # FAIRNESS-ACCURACY TRADEOFF
            KnowledgeEntry(
                id="tradeoff_001",
                title="Fairness-Accuracy Tradeoff",
                content="""In many cases, enforcing fairness constraints requires accepting 
slightly lower overall model accuracy. This is a fundamental tradeoff in machine learning fairness.

Why it Happens: 
- Fairness often requires treating different groups differently to achieve equal outcomes
- This can reduce overall accuracy, especially if one group is larger or easier to predict for
- Balancing fairness across all groups may not optimize for majority-group accuracy

Recommendation: When deploying AI systems, especially in high-stakes domains like hiring, lending, 
and criminal justice, fairness should be prioritized over marginal accuracy improvements. A 
slightly less accurate but fairer model is preferable to a more accurate but biased model.

NIST AI RMF Guidance: Organizations should document and justify the fairness-accuracy tradeoff 
explicitly in their AI governance frameworks.""",
                source="NIST AI Risk Management Framework, AIF360",
                category="Fairness Concepts",
                tags=["fairness_accuracy_tradeoff", "constraints", "design_decisions"],
                relevance_keywords=["tradeoff", "accuracy", "fairness", "constraint"]
            ),
            
            # EQUALIZED ODDS
            KnowledgeEntry(
                id="eo_001",
                title="Equalized Odds Fairness Metric",
                content="""Equalized odds require that a model's false positive rate and 
false negative rate are equal across demographic groups. Formally:

P(ŷ=1|A=a, Y=0) = P(ŷ=1|A=b, Y=0)  [Equal false positive rates]
P(ŷ=1|A=a, Y=1) = P(ŷ=1|A=b, Y=1)  [Equal true positive rates]

In plain language: The probability of an incorrect positive prediction should be the same 
for all groups. The probability of a correct positive prediction should also be the same.

Why It Matters: Equalized odds prevents both false positives (innocent people flagged) and 
false negatives (guilty people missed) from being biased. This is critical in criminal justice 
where both types of errors have serious consequences.

Limitation: Achieving equalized odds may require different decision thresholds for different 
groups, which can feel discriminatory even though it's fairer.""",
                source="Hardt, Price & Srebro (2016), AIF360",
                category="Fairness Metrics",
                tags=["equalized_odds", "false_positive", "false_negative", "equal_error"],
                relevance_keywords=["equalized", "odds", "false", "positive", "negative"]
            ),
            
            # MITIGATION STRATEGIES
            KnowledgeEntry(
                id="mitigation_001",
                title="Bias Mitigation Strategies",
                content="""When bias is detected in an AI system, several mitigation strategies 
can be employed:

1. **Data-Level Mitigation**: Rebalance training data, remove biased samples, or use stratified 
sampling to ensure equal representation of protected groups during training.

2. **Algorithm-Level Mitigation**: 
   - Constraint-based methods: Add fairness constraints during training (e.g., threshold 
     optimization, prejudice remover)
   - Preprocessing: Remove or decorrelate sensitive features
   - Postprocessing: Adjust prediction thresholds per group to achieve fairness

3. **Feature Engineering**: 
   - Remove features that directly use protected attributes
   - Identify and remove proxy features
   - Create more representative feature encodings

4. **Model Selection**: Choose model architectures that are less prone to bias (e.g., 
decision trees can be more interpretable for auditing than neural networks)

5. **Monitoring**: Continuously monitor model predictions for bias after deployment and 
retrain if fairness metrics degrade.

Fairlearn Implementation: Microsoft Fairlearn provides algorithms for threshold optimization 
and grid search over fairness constraints.""",
                source="Fairlearn Documentation, AIF360, Calmon et al.",
                category="Solutions",
                tags=["mitigation", "bias_reduction", "algorithm", "data", "monitoring"],
                relevance_keywords=["mitigate", "mitigation", "reduce", "fix", "solution"]
            ),
            
            # NIST AI RMF
            KnowledgeEntry(
                id="nist_001",
                title="NIST AI Risk Management Framework - Fairness Governance",
                content="""The NIST AI Risk Management Framework (AI RMF) provides guidance 
for organizations to manage risks from AI systems, including fairness and bias risks.

Key Principles:
1. **Map**: Document AI systems, their intended use, and potential harms
2. **Measure**: Assess risks including fairness metrics and demographic impact
3. **Manage**: Implement controls to mitigate identified risks
4. **Monitor**: Track fairness metrics throughout the AI lifecycle

For Fairness Specifically:
- Document protected groups relevant to your domain and use case
- Measure fairness metrics across all protected groups
- Create clear governance processes for fairness decisions
- Maintain audit trails of fairness assessments and mitigations
- Have explicit policies on fairness-accuracy tradeoffs

Requirement: For regulated industries (finance, hiring, criminal justice), fairness governance 
is increasingly a legal and regulatory requirement, not optional.""",
                source="NIST AI RMF 1.0 (2023)",
                category="Governance",
                tags=["nist", "governance", "risk", "framework", "compliance"],
                relevance_keywords=["nist", "governance", "framework", "risk", "audit"]
            ),
            
            # EU AI ACT
            KnowledgeEntry(
                id="eu_001",
                title="EU AI Act - High-Risk AI Classification",
                content="""The European Union's AI Act (2023) classifies certain AI applications 
as "high-risk" and requires enhanced transparency, testing, and fairness controls.

High-Risk Categories Relevant to Bias:
- Employment: AI systems used in recruitment, promotion, training decisions
- Credit and Finance: AI used for loan decisions, credit scoring, insurance
- Law Enforcement: AI used for criminal risk assessment, surveillance
- Education: AI used for educational tracking and placement
- Healthcare: AI used for medical diagnosis and resource allocation

Requirements for High-Risk Systems:
1. Pre-deployment bias testing and risk assessment
2. Regular bias monitoring post-deployment
3. Documented fairness-accuracy tradeoffs
4. Human review of significant decisions
5. Transparency: Users informed when AI is used

Penalties: Non-compliance can result in fines up to 6% of annual revenue.

Impact on FairLens: Any system deployed in EU must comply with these requirements, making 
fairness assessment and documentation critical.""",
                source="EU AI Act (2023)",
                category="Governance",
                tags=["eu_ai_act", "compliance", "regulation", "high_risk"],
                relevance_keywords=["eu", "regulation", "legal", "compliance", "high_risk"]
            ),
            
            # RECOMMENDED THRESHOLD
            KnowledgeEntry(
                id="threshold_001",
                title="Recommended Bias Risk Thresholds",
                content="""Different organizations and domains use different thresholds for 
acceptable bias risk. Here are commonly recommended thresholds:

For Disparate Impact Ratio:
- GREEN (Low Risk): > 0.90 (within 10% of reference group)
- YELLOW (Medium Risk): 0.80-0.90 (between 80%-90% rule)
- RED (High Risk): < 0.80 (violates 80% rule)

For Demographic Parity Difference:
- GREEN (Low Risk): < 0.05 (less than 5% difference in outcomes)
- YELLOW (Medium Risk): 0.05-0.10 (5-10% difference)
- RED (High Risk): > 0.10 (greater than 10% difference)

For Equalized Odds (False Positive Rate Difference):
- GREEN (Low Risk): < 0.10 (less than 10% difference in error rates)
- YELLOW (Medium Risk): 0.10-0.15 (10-15% difference)
- RED (High Risk): > 0.15 (greater than 15% difference)

Context Matters: High-stakes decisions (hiring, lending, criminal justice) require stricter 
thresholds. Lower-stakes decisions may tolerate higher bias levels.""",
                source="AIF360 Best Practices, EEOC Guidelines",
                category="Thresholds",
                tags=["threshold", "disparate_impact", "risk_level", "metric"],
                relevance_keywords=["threshold", "score", "risk", "level", "limit"]
            ),
        ]
    
    def get_all_entries(self) -> List[KnowledgeEntry]:
        """Return all knowledge base entries"""
        return self.entries
    
    def search_by_keywords(self, keywords: List[str], limit: int = 5) -> List[KnowledgeEntry]:
        """Search knowledge base by keywords"""
        matches = []
        keyword_set = set(kw.lower() for kw in keywords)
        
        for entry in self.entries:
            # Check if any relevance keywords match
            relevance_matches = sum(
                1 for rk in entry.relevance_keywords 
                if rk.lower() in keyword_set or any(
                    rk.lower().startswith(kw) or kw in rk.lower() 
                    for kw in keyword_set
                )
            )
            
            if relevance_matches > 0:
                matches.append((entry, relevance_matches))
        
        # Sort by relevance (descending) and return top matches
        matches.sort(key=lambda x: x[1], reverse=True)
        return [entry for entry, _ in matches[:limit]]
    
    def search_by_category(self, category: str) -> List[KnowledgeEntry]:
        """Get all entries in a category"""
        return [e for e in self.entries if e.category.lower() == category.lower()]
    
    def get_entry_by_id(self, entry_id: str) -> Optional[KnowledgeEntry]:
        """Get a specific entry by ID"""
        return next((e for e in self.entries if e.id == entry_id), None)


# Global instance
knowledge_base = FairnessKnowledgeBase()
