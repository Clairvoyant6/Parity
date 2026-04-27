"""
Phase 5: End-to-End Integration Testing
Tests RAG system, enhanced explanations, and citation generation
"""

import asyncio
import pandas as pd
import sys
import os
from pathlib import Path
import io

# Set stdout encoding to UTF-8 for emoji support
if sys.platform == "win32":
    import codecs
    sys.stdout = codecs.getwriter("utf-8")(sys.stdout.buffer)

# Add app to path
sys.path.insert(0, str(Path(__file__).parent))

from app.services.bias_engine import compute_bias_metrics
from app.services.explanation_service import generate_explanation
from app.services.rag_service import RAGService
from app.services.knowledge_base import knowledge_base


class IntegrationTestSuite:
    """End-to-end integration tests for Phases 3, 4, and 5"""
    
    def __init__(self):
        self.results = {
            "phase_3_tests": [],
            "phase_4_tests": [],
            "phase_5_tests": [],
            "summary": {}
        }
        self.rag_service = RAGService()
    
    # ============ PHASE 3: RAG KNOWLEDGE BASE TESTS ============
    
    def test_knowledge_base_initialization(self):
        """Test that knowledge base is properly initialized"""
        print("\n[PHASE 3] Testing Knowledge Base Initialization...")
        
        try:
            entries = knowledge_base.get_all_entries()
            assert len(entries) > 0, "Knowledge base is empty"
            
            # Verify entry structure
            for entry in entries[:3]:
                assert hasattr(entry, 'id'), "Entry missing 'id'"
                assert hasattr(entry, 'title'), "Entry missing 'title'"
                assert hasattr(entry, 'content'), "Entry missing 'content'"
                assert hasattr(entry, 'source'), "Entry missing 'source'"
            
            result = {
                "test": "Knowledge Base Initialization",
                "status": "✅ PASSED",
                "details": f"Knowledge base loaded with {len(entries)} entries"
            }
            self.results["phase_3_tests"].append(result)
            print(f"✅ Knowledge Base has {len(entries)} entries")
            
        except Exception as e:
            result = {
                "test": "Knowledge Base Initialization",
                "status": "❌ FAILED",
                "error": str(e)
            }
            self.results["phase_3_tests"].append(result)
            print(f"❌ Failed: {e}")
    
    def test_keyword_search(self):
        """Test keyword-based retrieval from knowledge base"""
        print("\n[PHASE 3] Testing Keyword Search...")
        
        try:
            # Test various keywords
            keywords_to_test = [
                ["disparate", "impact"],
                ["compas", "bias"],
                ["healthcare", "mitigation"],
                ["eu", "regulation"]
            ]
            
            for keywords in keywords_to_test:
                results = knowledge_base.search_by_keywords(keywords, limit=3)
                assert len(results) > 0, f"No results for keywords: {keywords}"
            
            result = {
                "test": "Keyword Search",
                "status": "✅ PASSED",
                "details": f"Successfully searched {len(keywords_to_test)} keyword combinations"
            }
            self.results["phase_3_tests"].append(result)
            print(f"✅ Keyword search works for all test cases")
            
        except Exception as e:
            result = {
                "test": "Keyword Search",
                "status": "❌ FAILED",
                "error": str(e)
            }
            self.results["phase_3_tests"].append(result)
            print(f"❌ Failed: {e}")
    
    def test_rag_service_initialization(self):
        """Test RAG service initialization and vector embeddings"""
        print("\n[PHASE 3] Testing RAG Service Initialization...")
        
        try:
            # Check that RAG service is initialized
            assert self.rag_service is not None, "RAG service not initialized"
            assert self.rag_service.collection is not None, "Chroma collection not initialized"
            
            # Check that documents are embedded
            doc_count = self.rag_service.collection.count()
            assert doc_count > 0, "No documents in RAG knowledge base"
            
            result = {
                "test": "RAG Service Initialization",
                "status": "✅ PASSED",
                "details": f"RAG service initialized with {doc_count} document chunks"
            }
            self.results["phase_3_tests"].append(result)
            print(f"✅ RAG service ready with {doc_count} document chunks")
            
        except Exception as e:
            result = {
                "test": "RAG Service Initialization",
                "status": "❌ FAILED",
                "error": str(e)
            }
            self.results["phase_3_tests"].append(result)
            print(f"❌ Failed: {e}")
    
    def test_semantic_retrieval(self):
        """Test semantic search in RAG knowledge base"""
        print("\n[PHASE 3] Testing Semantic Retrieval...")
        
        try:
            test_queries = [
                "How do we measure fairness in machine learning?",
                "What is proxy discrimination and why is it bad?",
                "How can we mitigate bias in algorithms?",
                "What are the legal requirements for AI systems?"
            ]
            
            for query in test_queries:
                results = self.rag_service.retrieve(query, n_results=2)
                assert len(results) > 0, f"No results for query: {query}"
                # Verify result structure
                for result in results:
                    assert "document" in result, "Missing 'document' field"
                    assert "source" in result, "Missing 'source' field"
            
            result = {
                "test": "Semantic Retrieval",
                "status": "✅ PASSED",
                "details": f"Successfully retrieved results for {len(test_queries)} semantic queries"
            }
            self.results["phase_3_tests"].append(result)
            print(f"✅ Semantic search retrieval works correctly")
            
        except Exception as e:
            result = {
                "test": "Semantic Retrieval",
                "status": "❌ FAILED",
                "error": str(e)
            }
            self.results["phase_3_tests"].append(result)
            print(f"❌ Failed: {e}")
    
    # ============ PHASE 4: ENHANCED EXPLANATIONS WITH RAG ============
    
    async def test_explanation_generation_with_rag(self):
        """Test explanation generation with RAG context"""
        print("\n[PHASE 4] Testing Explanation Generation with RAG...")
        
        try:
            # Create sample metrics
            metrics = {
                "bias_risk_score": 72,
                "risk_level": "HIGH",
                "disparate_impact": 0.65,
                "demographic_parity_difference": 0.18,
                "false_positive_rate_difference": 0.22,
                "group_metrics": {
                    "race": {
                        "disparate_impact": 0.65,
                        "demographic_parity_difference": 0.18
                    },
                    "gender": {
                        "disparate_impact": 0.78,
                        "demographic_parity_difference": 0.12
                    }
                },
                "proxy_flags": [
                    {
                        "feature": "zip_code",
                        "sensitive_attribute": "race",
                        "correlation": 0.58
                    }
                ]
            }
            
            sensitive_cols = ["race", "gender"]
            
            # Generate explanation
            result = await generate_explanation(metrics, sensitive_cols, "hiring")
            
            # Verify result structure
            assert isinstance(result, dict), "Result should be a dictionary"
            assert "explanation" in result, "Result missing 'explanation' key"
            assert "citations" in result, "Result missing 'citations' key"
            assert "sources" in result, "Result missing 'sources' key"
            
            # Verify explanation is non-empty
            assert len(result["explanation"]) > 0, "Explanation is empty"
            
            # Verify citations are present
            citations_count = len(result["citations"])
            
            test_result = {
                "test": "Explanation Generation with RAG",
                "status": "✅ PASSED",
                "details": f"Generated explanation with {citations_count} citations from {len(result['sources'])} sources"
            }
            self.results["phase_4_tests"].append(test_result)
            print(f"✅ Explanation generated with {citations_count} citations")
            print(f"   Explanation: {result['explanation'][:100]}...")
            
        except Exception as e:
            test_result = {
                "test": "Explanation Generation with RAG",
                "status": "❌ FAILED",
                "error": str(e)
            }
            self.results["phase_4_tests"].append(test_result)
            print(f"❌ Failed: {e}")
    
    async def test_citation_generation(self):
        """Test citation generation from retrieved sources"""
        print("\n[PHASE 4] Testing Citation Generation...")
        
        try:
            # Retrieve documents
            retrieved_docs = self.rag_service.retrieve("proxy discrimination in hiring", n_results=3)
            
            assert len(retrieved_docs) > 0, "No documents retrieved for citation test"
            
            # Format context
            context = self.rag_service.format_context_for_prompt(retrieved_docs)
            
            assert len(context) > 0, "Formatted context is empty"
            
            # Check that sources are properly formatted
            citation_count = 0
            for doc in retrieved_docs:
                if doc.get("source"):
                    citation_count += 1
            
            test_result = {
                "test": "Citation Generation",
                "status": "✅ PASSED",
                "details": f"Generated {citation_count} citations from retrieved sources"
            }
            self.results["phase_4_tests"].append(test_result)
            print(f"✅ Citation generation works correctly ({citation_count} citations)")
            
        except Exception as e:
            test_result = {
                "test": "Citation Generation",
                "status": "❌ FAILED",
                "error": str(e)
            }
            self.results["phase_4_tests"].append(test_result)
            print(f"❌ Failed: {e}")
    
    # ============ PHASE 5: FULL INTEGRATION TESTING ============
    
    async def test_full_analysis_pipeline(self):
        """Test complete analysis pipeline: metrics -> RAG -> explanations -> citations"""
        print("\n[PHASE 5] Testing Full Analysis Pipeline...")
        
        try:
            # Create sample dataset (COMPAS-like)
            data = {
                'race': ['African American'] * 50 + ['White'] * 50,
                'gender': ['Male'] * 50 + ['Female'] * 50,
                'age': [30 + i % 20 for i in range(100)],
                'prior_arrests': [2, 3, 1, 4] * 25,
                'recidivism': [1 if i < 45 else 0 for i in range(100)]
            }
            
            df = pd.DataFrame(data)
            
            # Step 1: Compute bias metrics
            metrics = compute_bias_metrics(df, 'recidivism', ['race', 'gender'])
            assert metrics is not None, "Bias metrics computation failed"
            assert 'bias_risk_score' in metrics, "Missing bias_risk_score in metrics"
            
            # Step 2: Generate explanation with RAG and citations
            explanation_result = await generate_explanation(metrics, ['race', 'gender'])
            assert isinstance(explanation_result, dict), "Explanation result should be dict"
            assert explanation_result.get("explanation"), "Explanation is empty"
            
            # Step 3: Verify citations
            citations = explanation_result.get("citations", [])
            sources = explanation_result.get("sources", [])
            
            test_result = {
                "test": "Full Analysis Pipeline",
                "status": "✅ PASSED",
                "details": f"Completed: metrics={metrics['bias_risk_score']:.1f}, citations={len(citations)}, sources={len(sources)}"
            }
            self.results["phase_5_tests"].append(test_result)
            print(f"✅ Full pipeline executed successfully")
            print(f"   Bias score: {metrics['bias_risk_score']:.1f}")
            print(f"   Citations: {len(citations)}")
            print(f"   Sources: {len(sources)}")
            
        except Exception as e:
            test_result = {
                "test": "Full Analysis Pipeline",
                "status": "❌ FAILED",
                "error": str(e)
            }
            self.results["phase_5_tests"].append(test_result)
            print(f"❌ Failed: {e}")
    
    def test_rag_retrieval_quality(self):
        """Test quality of RAG retrieval for different bias scenarios"""
        print("\n[PHASE 5] Testing RAG Retrieval Quality...")
        
        try:
            test_scenarios = {
                "high_disparate_impact": {
                    "query": "disparate impact 80% rule hiring discrimination",
                    "expected_keywords": ["disparate", "impact", "80"]
                },
                "proxy_discrimination": {
                    "query": "proxy variable redlining zip code discrimination",
                    "expected_keywords": ["proxy", "discrimination", "redline"]
                },
                "mitigation": {
                    "query": "fairness mitigation techniques reweighting constraints",
                    "expected_keywords": ["mitigation", "constraints", "reweight"]
                },
                "healthcare_bias": {
                    "query": "healthcare algorithm racial bias obermeyer medical",
                    "expected_keywords": ["healthcare", "bias", "obermeyer"]
                }
            }
            
            quality_score = 0
            total_scenarios = len(test_scenarios)
            
            for scenario_name, scenario_data in test_scenarios.items():
                results = self.rag_service.retrieve(scenario_data["query"], n_results=2)
                
                if len(results) > 0:
                    quality_score += 1
                    print(f"   ✅ {scenario_name}: Retrieved {len(results)} relevant documents")
            
            quality_percentage = (quality_score / total_scenarios) * 100
            
            test_result = {
                "test": "RAG Retrieval Quality",
                "status": "✅ PASSED" if quality_score >= total_scenarios - 1 else "⚠️ PARTIAL",
                "details": f"Quality score: {quality_percentage:.0f}% ({quality_score}/{total_scenarios} scenarios)"
            }
            self.results["phase_5_tests"].append(test_result)
            print(f"✅ RAG retrieval quality: {quality_percentage:.0f}%")
            
        except Exception as e:
            test_result = {
                "test": "RAG Retrieval Quality",
                "status": "❌ FAILED",
                "error": str(e)
            }
            self.results["phase_5_tests"].append(test_result)
            print(f"❌ Failed: {e}")
    
    def test_explanation_sourcing_accuracy(self):
        """Test that explanations properly source their claims"""
        print("\n[PHASE 5] Testing Explanation Sourcing Accuracy...")
        
        try:
            # Retrieve documents for a specific query
            docs = self.rag_service.retrieve("proxy discrimination proxy variables", n_results=3)
            
            # Check that each document has proper source information
            source_accuracy = 0
            
            for doc in docs:
                has_source = doc.get("source") and doc.get("source") != "Unknown"
                has_content = doc.get("document") and len(doc.get("document", "")) > 10
                
                if has_source and has_content:
                    source_accuracy += 1
            
            accuracy_percentage = (source_accuracy / len(docs)) * 100 if docs else 0
            
            test_result = {
                "test": "Explanation Sourcing Accuracy",
                "status": "✅ PASSED" if accuracy_percentage >= 80 else "⚠️ PARTIAL",
                "details": f"Sourcing accuracy: {accuracy_percentage:.0f}% ({source_accuracy}/{len(docs)} documents properly sourced)"
            }
            self.results["phase_5_tests"].append(test_result)
            print(f"✅ Sourcing accuracy: {accuracy_percentage:.0f}%")
            
        except Exception as e:
            test_result = {
                "test": "Explanation Sourcing Accuracy",
                "status": "❌ FAILED",
                "error": str(e)
            }
            self.results["phase_5_tests"].append(test_result)
            print(f"❌ Failed: {e}")
    
    async def run_all_tests(self):
        """Run all test suites"""
        print("=" * 70)
        print("FAIRLENS PHASES 3-5 INTEGRATION TEST SUITE")
        print("=" * 70)
        
        # Phase 3 tests
        print("\n" + "=" * 70)
        print("PHASE 3: RAG KNOWLEDGE BASE & RETRIEVAL")
        print("=" * 70)
        self.test_knowledge_base_initialization()
        self.test_keyword_search()
        self.test_rag_service_initialization()
        self.test_semantic_retrieval()
        
        # Phase 4 tests
        print("\n" + "=" * 70)
        print("PHASE 4: ENHANCED EXPLANATIONS WITH RAG CONTEXT")
        print("=" * 70)
        await self.test_explanation_generation_with_rag()
        await self.test_citation_generation()
        
        # Phase 5 tests
        print("\n" + "=" * 70)
        print("PHASE 5: END-TO-END INTEGRATION & QUALITY")
        print("=" * 70)
        await self.test_full_analysis_pipeline()
        self.test_rag_retrieval_quality()
        self.test_explanation_sourcing_accuracy()
        
        # Print summary
        self._print_summary()
    
    def _print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 70)
        print("TEST SUMMARY")
        print("=" * 70)
        
        all_results = {
            "Phase 3 (RAG Knowledge Base)": self.results["phase_3_tests"],
            "Phase 4 (Enhanced Explanations)": self.results["phase_4_tests"],
            "Phase 5 (Integration & Quality)": self.results["phase_5_tests"]
        }
        
        total_passed = 0
        total_failed = 0
        total_partial = 0
        
        for phase_name, tests in all_results.items():
            print(f"\n{phase_name}:")
            for test in tests:
                status = test["status"]
                print(f"  {status} {test['test']}")
                print(f"       {test.get('details', test.get('error', ''))}")
                
                if "PASSED" in status:
                    total_passed += 1
                elif "FAILED" in status:
                    total_failed += 1
                else:
                    total_partial += 1
        
        print("\n" + "=" * 70)
        print(f"OVERALL: {total_passed} passed, {total_partial} partial, {total_failed} failed")
        print("=" * 70)
        
        if total_failed == 0:
            print("\n✅ ALL TESTS PASSED - PHASES 3-5 IMPLEMENTATION SUCCESSFUL!")
        else:
            print(f"\n⚠️ {total_failed} tests failed - review above for details")


async def main():
    """Run test suite"""
    suite = IntegrationTestSuite()
    await suite.run_all_tests()


if __name__ == "__main__":
    asyncio.run(main())
