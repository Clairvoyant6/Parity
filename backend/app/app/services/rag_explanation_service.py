"""
Phase 3: Enhanced Explanation Service with RAG Integration
Integrates semantic search over fairness knowledge base with explanations.
"""

import httpx
import asyncio
from app.core.config import settings
from app.services.rag_service import RAGService
import warnings

warnings.filterwarnings('ignore')


class RAGEnhancedExplainer:
    """
    Generates bias explanations enhanced with retrieved fairness context.
    Uses RAG to provide authoritative, sourced explanations.
    """
    
    def __init__(self):
        """Initialize RAG service for knowledge retrieval."""
        self.rag_service = RAGService()
    
    async def generate_sourced_explanation(
        self,
        metrics: dict,
        sensitive_cols: list,
        domain: str = "general",
        bias_type: str = ""
    ) -> dict:
        """
        Generate explanation enhanced with retrieved fairness context.
        
        Args:
            metrics: Bias metrics from bias_engine
            sensitive_cols: Sensitive attributes analyzed
            domain: Application domain (hiring, lending, criminal justice, etc.)
            bias_type: Type of detected bias (disparate impact, proxy, etc.)
        
        Returns:
            dict: Sourced explanation with citations
        """
        
        # Build context for knowledge retrieval
        search_context = self._build_search_context(metrics, domain, bias_type, sensitive_cols)
        
        # Retrieve relevant fairness knowledge
        retrieved_docs = self.rag_service.retrieve(search_context, n_results=3)
        
        # Generate base explanation with Groq
        base_explanation = await self._generate_base_explanation(
            metrics, sensitive_cols, domain
        )
        
        # Enhance with retrieved context
        enhanced_explanation = self._enhance_with_context(
            base_explanation, retrieved_docs, metrics
        )
        
        return {
            "explanation": enhanced_explanation,
            "sources": self._format_sources(retrieved_docs),
            "base_explanation": base_explanation,
            "retrieved_context": retrieved_docs,
            "search_query": search_context,
        }
    
    def _build_search_context(
        self,
        metrics: dict,
        domain: str,
        bias_type: str,
        sensitive_cols: list
    ) -> str:
        """Build effective search query for knowledge retrieval."""
        
        risk_level = metrics.get("risk_level", "MEDIUM")
        bias_score = metrics.get("bias_risk_score", 50)
        
        # Identify bias type from metrics if not provided
        if not bias_type:
            if metrics.get("disparate_impact_avg", 1.0) < 0.8:
                bias_type = "disparate impact discrimination"
            elif metrics.get("proxy_flags"):
                bias_type = "proxy discrimination indirect"
            else:
                bias_type = "bias fairness"
        
        # Build rich search query
        search_parts = [
            bias_type,
            f"{risk_level} risk bias",
            f"{domain} discrimination",
            f"protected attributes {', '.join(sensitive_cols[:2])}",
        ]
        
        if metrics.get("disparate_impact_avg", 1.0) < 0.8:
            search_parts.append("80% rule disparate impact")
        
        if metrics.get("proxy_flags"):
            search_parts.append("proxy variables feature selection")
        
        return " ".join(search_parts)
    
    async def _generate_base_explanation(
        self,
        metrics: dict,
        sensitive_cols: list,
        domain: str
    ) -> str:
        """Generate initial explanation using Groq LLM."""
        
        risk_level = metrics.get("risk_level", "UNKNOWN")
        risk_score = metrics.get("bias_risk_score", 0)
        group_metrics = metrics.get("group_metrics", {})
        proxy_flags = metrics.get("proxy_flags", [])
        
        # Build context from metrics
        proxy_text = ""
        if proxy_flags:
            proxy_text = "Potential indirect discrimination detected: " + ", ".join(
                [f"{p['feature']} (correlates with {p['sensitive_attribute']})"
                 for p in proxy_flags[:2]]
            )
        
        group_text = ""
        for col, data in group_metrics.items():
            di = data.get("disparate_impact_ratio", 1.0)
            group_text += f"\n- {col}: Disparate Impact = {di}"
        
        prompt = f"""You are a fairness expert explaining AI bias detection results.
        
A dataset has been analyzed for discrimination with these findings:
- Bias Risk Score: {risk_score}/100 ({risk_level} risk)
- Domain: {domain}
- Sensitive groups analyzed: {', '.join(sensitive_cols)}
{group_text}
{proxy_text}

Write a clear, non-technical explanation (3-4 sentences) that:
1. States whether bias was found and how serious it is
2. Explains WHAT was detected (disparate impact, proxy bias, etc)
3. Explains WHY this matters for the affected groups
4. Recommends ONE specific action to reduce bias

Use plain language. No jargon. Assume the reader has no ML background."""
        
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
                                "content": "You are an AI fairness expert. Explain bias clearly in plain language."
                            },
                            {
                                "role": "user",
                                "content": prompt
                            }
                        ],
                        "max_tokens": 400,
                        "temperature": 0.7
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data["choices"][0]["message"]["content"]
        
        except Exception:
            pass
        
        # Fallback explanation
        return f"""The analysis detected {risk_level.lower()} bias risk (score: {risk_score}/100) 
        across groups: {', '.join(sensitive_cols)}. {proxy_text if proxy_text else 'Disparate outcomes detected.'}
        This means different demographic groups may receive different treatment by the model."""
    
    def _enhance_with_context(
        self,
        explanation: str,
        retrieved_docs: list,
        metrics: dict
    ) -> str:
        """Enhance explanation with retrieved authoritative context."""
        
        enhanced = explanation
        
        if retrieved_docs:
            enhanced += "\n\n[RESEARCH & POLICY CONTEXT]\n"
            enhanced += "=" * 50 + "\n"
            
            # Add top source citations
            for i, doc in enumerate(retrieved_docs[:2], 1):
                enhanced += f"\n{i}. {doc['title']}\n"
                enhanced += f"   Source: {doc['source']}\n"
                
                # Add relevant snippet
                if doc['document']:
                    snippet = doc['document'][:250]
                    if len(doc['document']) > 250:
                        snippet += "..."
                    enhanced += f"   Key point: {snippet}\n"
        
        return enhanced
    
    def _format_sources(self, retrieved_docs: list) -> list:
        """Format retrieved documents as citation list."""
        
        sources = []
        seen_titles = set()
        
        for doc in retrieved_docs:
            title = doc.get('title', '')
            source = doc.get('source', '')
            topics = doc.get('topics', '')
            
            # Deduplicate by source
            if source not in seen_titles:
                sources.append({
                    "title": title,
                    "source": source,
                    "topics": topics.split(", ") if topics else [],
                    "url": self._get_source_url(doc.get('source_id', ''))
                })
                seen_titles.add(source)
        
        return sources
    
    def _get_source_url(self, source_id: str) -> str:
        """Get URL for a source ID."""
        
        source_urls = {
            "obermeyer_2019": "https://www.science.org/doi/10.1126/science.aax2342",
            "propublica_compas": "https://www.propublica.org/article/machine-bias",
            "nist_ai_rmf": "https://airc.nist.gov/AI_RMF_1.0",
            "eu_ai_act": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex:32021r0888",
            "aif360_mitigation": "https://aif360.mybluemix.net",
            "hardt_equality_opportunity": "https://arxiv.org/abs/1610.02413",
            "disparate_impact": "https://www.eeoc.gov/laws/guidance/documents",
            "fairlearn_constraints": "https://fairlearn.org/",
            "shap_bias": "https://shap.readthedocs.io/",
            "proxy_discrimination": "https://arxiv.org/search/?query=proxy+discrimination"
        }
        
        return source_urls.get(source_id, "")
