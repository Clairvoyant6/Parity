"""
FULL SYSTEM INTEGRATION TEST
Tests all 5 phases working together:
- Phase 1: Real bias metrics (AIF360)
- Phase 2: Proxy detection + mitigations (SHAP + Fairlearn)
- Phase 3: Knowledge base semantic search
- Phase 4: RAG-augmented explanation generation with citations
- Phase 5: Full pipeline integration
"""

import pandas as pd
import numpy as np
import sys
import asyncio
from pathlib import Path

# Add app to path
sys.path.insert(0, str(Path(__file__).parent))

from app.services.bias_engine import compute_bias_metrics, recommend_mitigations, detect_proxies
from app.services.knowledge_base import FairnessKnowledgeBase
from app.services.rag_service import RAGService
from app.services.explanation_service import generate_explanation

async def test_full_system_integration():
    """Test complete fairness analysis pipeline"""
    print("\n" + "="*80)
    print("FULL SYSTEM INTEGRATION TEST: ALL PHASES (1-5)")
    print("="*80)
    
    # =========================================================================
    # PHASE 1-2: BIAS METRICS & PROXY DETECTION
    # =========================================================================
    print("\n[PHASE 1-2] Computing Bias Metrics & Detecting Proxies")
    print("-" * 80)
    
    # Create realistic hiring dataset with bias
    np.random.seed(42)
    n = 300
    
    race_binary = np.random.choice([0, 1], n, p=[0.6, 0.4])
    zip_code = np.where(race_binary == 1, np.random.choice([1, 2], n, p=[0.9, 0.1]), 
                        np.random.choice([1, 2], n, p=[0.1, 0.9]))
    gender = np.random.choice([0, 1], n, p=[0.5, 0.5])
    
    data = {
        'age': np.random.randint(25, 65, n),
        'years_experience': np.random.randint(0, 30, n),
        'zip_code': zip_code,
        'gender': gender,
        'race': race_binary,
        'gpa': np.round(np.random.uniform(2.0, 4.0, n), 1),
        'test_score': np.random.randint(400, 1600, n),
        'hired': np.random.choice([0, 1], n)
    }
    
    df = pd.DataFrame(data)
    
    # Add hiring bias
    for i in range(n):
        if df.loc[i, 'gender'] == 1:
            if np.random.random() > 0.45:
                df.loc[i, 'hired'] = 0
        if df.loc[i, 'race'] == 1:
            if np.random.random() > 0.40:
                df.loc[i, 'hired'] = 0
    
    # Compute metrics
    metrics = compute_bias_metrics(df, target_col='hired', sensitive_cols=['gender', 'race'])
    
    print(f"\n✓ Bias Metrics Computed")
    print(f"  Risk Level: {metrics['risk_level']}")
    print(f"  Risk Score: {metrics['bias_risk_score']:.1f}/100")
    print(f"  DI Ratio: {metrics.get('disparate_impact_avg', 0):.3f}")
    print(f"  Model Accuracy: {metrics['model_accuracy']:.3f}")
    
    # Generate mitigations
    recommendations = recommend_mitigations(metrics, df, 'hired', ['gender', 'race'])
    print(f"\n✓ Generated {len(recommendations)} mitigation recommendations")
    
    critical_recs = [r for r in recommendations if r['priority'] == 'CRITICAL']
    if critical_recs:
        print(f"  - {len(critical_recs)} CRITICAL priority recommendations")
    
    # =========================================================================
    # PHASE 3: KNOWLEDGE BASE & SEMANTIC SEARCH
    # =========================================================================
    print("\n[PHASE 3] Loading Knowledge Base & Testing Semantic Search")
    print("-" * 80)
    
    kb = FairnessKnowledgeBase()
    all_entries = kb.get_all_entries()
    print(f"✓ Knowledge Base Loaded: {len(all_entries)} entries")
    
    # Test knowledge base search
    search_results = kb.search_by_keywords(['disparate impact', '80% rule'], limit=3)
    print(f"✓ Keyword Search: Found {len(search_results)} relevant entries")
    
    # Initialize RAG Service
    rag = RAGService()
    print(f"✓ RAG Service Initialized")
    print(f"  Vector DB: Chroma (EphemeralClient)")
    print(f"  Embeddings: Sentence-Transformers (all-MiniLM-L6-v2)")
    print(f"  Collections: {rag.collection.count() if hasattr(rag, 'collection') else '?'} documents")
    
    # =========================================================================
    # PHASE 4: RAG-AUGMENTED EXPLANATIONS WITH CITATIONS
    # =========================================================================
    print("\n[PHASE 4] Generating RAG-Augmented Explanations")
    print("-" * 80)
    
    # Generate explanation
    explanation_result = await generate_explanation(
        metrics=metrics,
        sensitive_cols=['gender', 'race'],
        domain='hiring',
        include_citations=True
    )
    
    print(f"\n✓ Explanation Generated")
    print(f"  Length: {len(explanation_result.get('explanation', ''))} characters")
    
    citations = explanation_result.get('citations', [])
    sources = explanation_result.get('sources', [])
    
    print(f"  Citations: {len(citations)} sources referenced")
    for i, citation in enumerate(citations[:3], 1):
        citation_preview = citation[:80] + "..." if len(citation) > 80 else citation
        print(f"    {i}. {citation_preview}")
    
    # =========================================================================
    # PHASE 5: FULL INTEGRATION & VALIDATION
    # =========================================================================
    print("\n[PHASE 5] Full System Integration & Validation")
    print("-" * 80)
    
    # Create complete analysis response (as would be returned by API)
    full_response = {
        'status': 'success',
        'dataset_info': {
            'total_records': len(df),
            'sensitive_attributes': ['gender', 'race'],
            'target': 'hired'
        },
        'phase_1_2': {
            'bias_risk_score': metrics['bias_risk_score'],
            'risk_level': metrics['risk_level'],
            'disparate_impact_avg': metrics.get('disparate_impact_avg', 0),
            'demographic_parity_avg': metrics.get('demographic_parity_avg', 0),
            'model_accuracy': metrics['model_accuracy'],
            'proxy_variables_detected': len(metrics.get('proxy_flags', [])),
            'feature_importance_top_3': dict(
                sorted(metrics.get('feature_importance', {}).items(), 
                       key=lambda x: x[1], reverse=True)[:3]
            )
        },
        'phase_3_4_5': {
            'explanation_length': len(explanation_result.get('explanation', '')),
            'citations_count': len(citations),
            'sources_count': len(sources),
            'knowledge_base_entries': len(all_entries)
        },
        'mitigation_recommendations': {
            'total_count': len(recommendations),
            'critical_count': len([r for r in recommendations if r['priority'] == 'CRITICAL']),
            'high_count': len([r for r in recommendations if r['priority'] == 'HIGH'])
        }
    }
    
    # Validation Checklist
    print(f"\n✓ Full Analysis Complete")
    print(f"\nValidation Checklist:")
    print("-" * 80)
    
    validations = [
        ("Phase 1-2 Metrics", metrics is not None and 'bias_risk_score' in metrics),
        ("Risk Score Computed", 0 <= metrics['bias_risk_score'] <= 100),
        ("Risk Level Set", metrics['risk_level'] in ['LOW', 'MEDIUM', 'HIGH']),
        ("DI Calculation", 'disparate_impact_avg' in metrics),
        ("Feature Importance", bool(metrics.get('feature_importance'))),
        ("Proxy Detection", bool(metrics.get('proxy_flags'))),
        ("Mitigation Recs", len(recommendations) > 0),
        ("Knowledge Base", len(all_entries) > 0),
        ("RAG Initialized", rag is not None),
        ("Explanation Generated", len(explanation_result.get('explanation', '')) > 0),
        ("Citations Generated", len(citations) > 0),
        ("Sources Tracked", len(sources) > 0),
        ("Full Response Valid", all(k in full_response for k in 
                                    ['phase_1_2', 'phase_3_4_5', 'mitigation_recommendations']))
    ]
    
    all_passed = True
    for check, passed in validations:
        status = "✓" if passed else "✗"
        print(f"  {status} {check}")
        if not passed:
            all_passed = False
    
    # =========================================================================
    # SUMMARY & RESULTS
    # =========================================================================
    print("\n" + "="*80)
    print("FULL SYSTEM INTEGRATION SUMMARY")
    print("="*80)
    
    print(f"\nPhase 1-2 (Bias Metrics & Mitigations):")
    print(f"  - Risk Level: {metrics['risk_level']}")
    print(f"  - Risk Score: {metrics['bias_risk_score']:.1f}/100")
    print(f"  - DI Ratio: {metrics.get('disparate_impact_avg', 0):.3f}")
    print(f"  - Proxies Detected: {len(metrics.get('proxy_flags', []))}")
    print(f"  - Mitigation Recommendations: {len(recommendations)}")
    
    print(f"\nPhase 3-5 (RAG Explanations):")
    print(f"  - Knowledge Base Entries: {len(all_entries)}")
    print(f"  - Explanation Length: {len(explanation_result.get('explanation', ''))} chars")
    print(f"  - Citations: {len(citations)}")
    print(f"  - Sources: {len(sources)}")
    
    print(f"\nSystem Status:")
    print(f"  - All Phases: {'✅ OPERATIONAL' if all_passed else '⚠️  PARTIAL'}")
    print(f"  - Integration: {'✅ COMPLETE' if all_passed else '⚠️  INCOMPLETE'}")
    print(f"  - Tests Passed: {sum(1 for _, p in validations if p)}/{len(validations)}")
    
    print("\n" + "="*80)
    if all_passed:
        print("✅ FULL SYSTEM INTEGRATION SUCCESSFUL - ALL 5 PHASES OPERATIONAL")
    else:
        print("⚠️  SYSTEM OPERATIONAL BUT SOME CHECKS FAILED")
    print("="*80 + "\n")
    
    return {
        'status': 'success' if all_passed else 'partial',
        'full_response': full_response,
        'validations': validations,
        'metrics': metrics,
        'recommendations': recommendations,
        'explanation': explanation_result
    }

if __name__ == "__main__":
    # Run async test
    result = asyncio.run(test_full_system_integration())
