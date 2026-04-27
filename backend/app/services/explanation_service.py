import httpx
from typing import Tuple, Dict, Any, List
from app.core.config import settings
from app.services.rag_service import RAGService

# Initialize RAG service for Phase 3/4 RAG context retrieval
rag_service = RAGService()

async def generate_explanation(
    metrics: dict,
    sensitive_cols: list,
    domain: str = "general",
    include_citations: bool = True
) -> Dict[str, Any]:
    """
    Calls Groq API to generate a plain-language bias explanation with RAG context
    
    Returns:
        dict with keys:
            - explanation: main explanation text
            - citations: list of source citations
            - sources: list of retrieved knowledge documents
    """
    risk_level = metrics.get("risk_level", "UNKNOWN")
    risk_score = metrics.get("bias_risk_score", 0)
    group_metrics = metrics.get("group_metrics", {})
    proxy_flags = metrics.get("proxy_flags", [])

    # PHASE 3: Retrieve relevant fairness knowledge using RAG
    rag_context = _retrieve_rag_context(risk_level, metrics, sensitive_cols)
    rag_docs = rag_context.get("documents", [])
    
    # Build context from metrics
    proxy_text = ""
    if proxy_flags:
        proxy_text = "Proxy features detected: " + ", ".join(
            [f"{p['feature']} correlates with {p['sensitive_attribute']} (r={p['correlation']})"
             for p in proxy_flags[:3]]
        )

    group_text = ""
    for col, data in group_metrics.items():
        di = data.get("disparate_impact", 1.0)
        dp = data.get("demographic_parity_difference", 0)
        group_text += f"\n- {col}: Disparate Impact = {di}, Demographic Parity Diff = {dp}"

    # PHASE 4: Build prompt with RAG context and authoritative sources
    rag_context_text = ""
    if rag_docs:
        rag_context_text = "\n\nAuthoritative context from fairness research:\n"
        for i, doc in enumerate(rag_docs[:2], 1):
            rag_context_text += f"{i}. {doc.get('source', 'Unknown source')}: {doc.get('title', '')}\n"
            rag_context_text += f"   Key insight: {doc.get('document', '')[:150]}...\n"

    prompt = f"""You are a fairness expert explaining AI bias to a non-technical audience.

A dataset has been analyzed for bias with these results:
- Bias Risk Score: {risk_score}/100 ({risk_level} risk)
- Domain: {domain}
- Sensitive attributes analyzed: {', '.join(sensitive_cols)}
{group_text}
{proxy_text}
{rag_context_text}

Write a plain-language explanation (3-4 sentences) that:
1. States what bias was found and how serious it is
2. Explains WHY this bias likely exists in simple terms (reference the provided context if relevant)
3. States which real people are most affected
4. Gives one concrete recommended action to reduce the bias

Do NOT use jargon. Write as if explaining to an HR manager with no ML background.
When applicable, reference the authoritative sources provided above."""

    # If no API key set, return rule-based fallback
    if not settings.GROQ_API_KEY:
        result = _rule_based_explanation(metrics, sensitive_cols)
        return {
            "explanation": result,
            "citations": _generate_citations(rag_docs),
            "sources": rag_docs
        }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "llama3-8b-8192",
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are an AI fairness expert. Always explain bias in plain, simple language that anyone can understand. When relevant, reference authoritative sources like NIST AI RMF, EU AI Act, and academic research."
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    "max_tokens": 500,
                    "temperature": 0.7
                }
            )

            if response.status_code != 200:
                result = _rule_based_explanation(metrics, sensitive_cols)
                return {
                    "explanation": result,
                    "citations": _generate_citations(rag_docs),
                    "sources": rag_docs
                }

            data = response.json()
            explanation_text = data["choices"][0]["message"]["content"]
            
            # PHASE 4: Generate citations for the explanation
            return {
                "explanation": explanation_text,
                "citations": _generate_citations(rag_docs),
                "sources": rag_docs
            }

    except Exception as e:
        # Fallback if API call fails
        result = _rule_based_explanation(metrics, sensitive_cols)
        return {
            "explanation": result,
            "citations": _generate_citations(rag_docs),
            "sources": rag_docs
        }


def _rule_based_explanation(metrics: dict, sensitive_cols: list) -> str:
    """Fallback explanation if Groq API is unavailable"""
    risk_score = metrics.get("bias_risk_score", 0)
    risk_level = metrics.get("risk_level", "UNKNOWN")
    proxy_flags = metrics.get("proxy_flags", [])

    explanation = (
        f"This dataset shows a {risk_level} bias risk (score: {risk_score}/100) "
        f"across sensitive attributes: {', '.join(sensitive_cols)}. "
    )

    if proxy_flags:
        top = proxy_flags[0]
        explanation += (
            f"Proxy discrimination detected: '{top['feature']}' correlates strongly "
            f"with '{top['sensitive_attribute']}' (r={top['correlation']}), meaning "
            f"the model may discriminate indirectly even without using the protected "
            f"attribute directly. "
        )

    if risk_score >= 65:
        explanation += (
            "Immediate action recommended: apply reweighing or threshold "
            "optimization before deploying this model in any real-world system."
        )
    elif risk_score >= 35:
        explanation += (
            "Monitor closely and consider reweighing the training data "
            "to improve fairness across groups."
        )
    else:
        explanation += (
            "Bias levels are relatively low, but continue monitoring "
            "across all demographic groups before deployment."
        )

    return explanation


def _retrieve_rag_context(
    risk_level: str,
    metrics: dict,
    sensitive_cols: list
) -> Dict[str, Any]:
    """
    PHASE 3: Retrieve relevant fairness knowledge from RAG knowledge base
    
    Args:
        risk_level: "HIGH", "MEDIUM", or "LOW"
        metrics: Bias metrics dictionary
        sensitive_cols: List of sensitive attributes
    
    Returns:
        Dictionary with retrieved documents and context
    """
    try:
        # Build search query based on risk level and metrics
        query_parts = [risk_level.lower(), "fairness", "bias"]
        
        # Add metric-specific keywords
        if metrics.get("disparate_impact", 1.0) < 0.8:
            query_parts.extend(["disparate impact", "80% rule"])
        
        if metrics.get("demographic_parity_difference", 0) > 0.1:
            query_parts.extend(["demographic parity"])
        
        if metrics.get("false_positive_rate_difference", 0) > 0.15:
            query_parts.extend(["equalized odds", "false positive rate"])
        
        if risk_level == "HIGH":
            query_parts.extend(["mitigation", "constraints", "reweighting"])
        
        search_query = " ".join(query_parts)
        
        # Retrieve from RAG knowledge base
        documents = rag_service.retrieve(search_query, n_results=3)
        
        return {
            "documents": documents,
            "query": search_query
        }
    except Exception as e:
        print(f"[WARNING] RAG retrieval failed: {e}")
        return {"documents": [], "query": ""}


def _generate_citations(
    retrieved_docs: List[Dict[str, Any]]
) -> List[str]:
    """
    PHASE 4: Generate citations from retrieved documents
    
    Args:
        retrieved_docs: List of retrieved knowledge documents
    
    Returns:
        List of formatted citation strings
    """
    citations = []
    
    if not retrieved_docs:
        return citations
    
    # Track unique sources to avoid duplicate citations
    seen_sources = set()
    
    for doc in retrieved_docs:
        source = doc.get("source", "Unknown")
        title = doc.get("title", "")
        topics = doc.get("topics", "")
        
        # Create unique citation identifier
        citation_key = f"{source}|{title}"
        
        if citation_key not in seen_sources and source != "Unknown":
            citation = f"{source}"
            if title:
                citation += f" - {title}"
            
            citations.append(citation)
            seen_sources.add(citation_key)
    
    return citations