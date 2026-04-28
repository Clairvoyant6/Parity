"""
Test Phase 3: RAG System Integration
Tests knowledge base retrieval and explanation augmentation
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.rag_service import RAGService


def test_rag_initialization():
    """[TEST] Initialize RAG service and knowledge base"""
    try:
        rag = RAGService(db_path="./test_chroma_db")
        assert rag.collection is not None
        count = rag.collection.count()
        print(f"[PASS] RAG service initialized with {count} documents in knowledge base")
        return True
    except Exception as e:
        print(f"[FAIL] RAG initialization failed: {e}")
        return False


def test_knowledge_base_retrieval():
    """[TEST] Retrieve documents from knowledge base"""
    try:
        rag = RAGService(db_path="./test_chroma_db")
        
        # Test disparate impact query
        results = rag.retrieve("disparate impact discrimination", n_results=3)
        
        assert len(results) > 0, "No results retrieved"
        assert all('document' in r and 'source' in r for r in results), "Missing fields in results"
        
        print(f"[PASS] Knowledge retrieval working: retrieved {len(results)} documents")
        for i, doc in enumerate(results[:2], 1):
            print(f"  {i}. {doc['title']} ({doc['source']})")
        
        return True
    except Exception as e:
        print(f"[FAIL] Knowledge retrieval failed: {e}")
        return False


def test_topic_search():
    """[TEST] Search by fairness topic"""
    try:
        rag = RAGService(db_path="./test_chroma_db")
        
        topics = [
            "bias detection proxy discrimination",
            "fairness metrics demographic parity",
            "healthcare algorithm bias",
        ]
        
        all_pass = True
        for topic in topics:
            results = rag.search_by_topic(topic, n_results=2)
            if len(results) > 0:
                print(f"[PASS] Found {len(results)} documents for topic: '{topic}'")
            else:
                print(f"[WARN] No documents found for topic: '{topic}'")
                all_pass = False
        
        return all_pass
    except Exception as e:
        print(f"[FAIL] Topic search failed: {e}")
        return False


def test_semantic_similarity():
    """[TEST] Verify semantic search is finding relevant documents"""
    try:
        rag = RAGService(db_path="./test_chroma_db")
        
        # Query about disparate impact
        di_results = rag.retrieve("This model has worse accuracy for Black applicants", n_results=3)
        
        # Check if results mention disparate impact or related concepts
        found_relevant = False
        for result in di_results:
            if any(word in result['document'].lower() for word in 
                   ['disparate', 'impact', 'discrimination', 'bias', 'fairness']):
                found_relevant = True
                break
        
        if found_relevant:
            print("[PASS] Semantic search finding relevant fairness documents")
            print(f"  Most relevant: {di_results[0]['title']}")
            return True
        else:
            print("[WARN] Semantic search results may not be well-matched")
            return False
    
    except Exception as e:
        print(f"[FAIL] Semantic similarity test failed: {e}")
        return False


def test_knowledge_base_coverage():
    """[TEST] Verify all knowledge base sources are loaded"""
    try:
        rag = RAGService(db_path="./test_chroma_db")
        
        # Known sources that should be in the knowledge base
        expected_sources = [
            "ProPublica",
            "Obermeyer",
            "NIST",
            "EU AI Act",
            "AIF360",
            "SHAP",
            "Fairlearn"
        ]
        
        # Retrieve a broad query to check variety
        results = rag.retrieve("fairness bias discrimination", n_results=10)
        
        found_sources = set()
        for result in results:
            source = result['source']
            for expected in expected_sources:
                if expected.lower() in source.lower():
                    found_sources.add(expected)
        
        coverage = len(found_sources) / len(expected_sources)
        print(f"[{'PASS' if coverage > 0.5 else 'WARN'}] Knowledge base coverage: {len(found_sources)}/{len(expected_sources)} sources")
        print(f"  Found: {', '.join(sorted(found_sources))}")
        
        return coverage > 0.5
    
    except Exception as e:
        print(f"[FAIL] Coverage test failed: {e}")
        return False


def run_all_tests():
    """Run all RAG tests"""
    print("\n" + "="*60)
    print("PHASE 3: RAG SYSTEM TESTS")
    print("="*60)
    
    tests = [
        test_rag_initialization,
        test_knowledge_base_retrieval,
        test_topic_search,
        test_semantic_similarity,
        test_knowledge_base_coverage,
    ]
    
    results = []
    for test in tests:
        result = test()
        results.append(result)
        print()
    
    # Summary
    passed = sum(results)
    total = len(results)
    print("="*60)
    print(f"SUMMARY: {passed}/{total} tests passed")
    print("="*60)
    
    return all(results)


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
