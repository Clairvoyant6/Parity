"""
Phase 3: RAG (Retrieval-Augmented Generation) System
Implements semantic search over fairness knowledge base.
Retrieves authoritative sources to augment explanations.
"""

import os
import json
from typing import List, Dict, Tuple
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
import warnings

warnings.filterwarnings('ignore')


# Curated fairness knowledge base from authoritative sources
FAIRNESS_KNOWLEDGE_BASE = [
    {
        "id": "obermeyer_2019",
        "title": "Obermeyer et al. - Healthcare Bias",
        "content": """
Healthcare algorithms have been shown to systematically discriminate against 
Black patients. Obermeyer et al. (2019) found that a widely used healthcare 
algorithm had consistently lower predictions for Black patients, leading to 
earlier intervention for white patients. This occurs because algorithms often 
use historical data that reflects previous discrimination.

Key findings:
- Algorithms should be audited for differential performance across groups
- Historical data may encode historical discrimination
- Equal performance doesn't mean equal outcomes if training data is biased
- Mitigation requires both technical and institutional changes
        """,
        "source": "Obermeyer et al., Science, 2019",
        "topics": ["healthcare", "racial bias", "proxy discrimination", "algorithmic bias"]
    },
    {
        "id": "propublica_compas",
        "title": "ProPublica - COMPAS Algorithm Investigation",
        "content": """
ProPublica's investigation of the COMPAS recidivism assessment algorithm revealed 
significant racial disparities. Black defendants were labeled 'higher risk but 
didn't reoffend' at nearly twice the rate of white defendants.

Key findings:
- Disparate impact: False positive rate for Black defendants was 44.9%, vs 23.5% for white
- The algorithm claimed to be race-neutral but produced racially disparate outcomes
- Different error rates across groups even when looking at the same outcome
- 'Fairness' definitions matter: calibration vs. equal false positive rates
- Demonstrates the difficulty of achieving multiple fairness definitions simultaneously
        """,
        "source": "ProPublica, 2016",
        "topics": ["criminal justice", "recidivism", "disparate impact", "fairness metrics"]
    },
    {
        "id": "nist_ai_rmf",
        "title": "NIST AI Risk Management Framework",
        "content": """
The NIST AI Risk Management Framework (AI RMF) provides guidance on managing 
AI risks, including fairness and discrimination risks.

Key principles:
1. Govern: Establish processes for AI governance and risk management
2. Map: Understand AI systems, data sources, and potential harms
3. Measure: Test AI systems for bias and fairness issues
4. Manage: Implement controls to mitigate identified risks

For fairness specifically:
- Test across demographic groups for performance differences
- Consider multiple fairness metrics (not just overall accuracy)
- Document data lineage and potential historical biases
- Implement ongoing monitoring for drift in fairness metrics
- Maintain transparency in how systems handle different groups
        """,
        "source": "NIST AI RMF, 2023",
        "topics": ["framework", "governance", "risk management", "fairness testing"]
    },
    {
        "id": "eu_ai_act",
        "title": "EU AI Act - Fairness & Transparency Requirements",
        "content": """
The EU AI Act establishes legal requirements for fairness and non-discrimination 
in high-risk AI systems.

Legal requirements:
1. Documentation: AI systems must document their design and training data
2. Bias monitoring: Systems must be monitored for biased performance
3. Human oversight: High-risk decisions require human review
4. Transparency: Users must be informed when AI is making decisions

Fairness requirements:
- AI systems must not result in prohibited discrimination
- Special scrutiny for decisions affecting fundamental rights
- Protection for persons from discrimination based on protected characteristics
- Data quality requirements to prevent bias from training data
        """,
        "source": "EU AI Act, 2024",
        "topics": ["regulation", "compliance", "transparency", "legal requirements"]
    },
    {
        "id": "aif360_mitigation",
        "title": "IBM AIF360 - Fairness Mitigation Techniques",
        "content": """
AIF360 provides multiple fairness mitigation algorithms:

Pre-processing (data-level):
- Reweighing: Adjust sample weights to balance outcomes
- Data preprocessing: Remove or modify discriminatory features
- Synthetic data generation: Balance training data across groups

In-processing (model-level):
- Threshold optimization: Adjust decision thresholds per group
- Constrained models: Train with fairness constraints
- Fair representations: Learn representations that reduce bias

Post-processing (prediction-level):
- Output calibration: Equalize false positive/negative rates
- Individual fairness: Ensure similar people get similar treatment

Selection:
- Fairness metrics matter: Different metrics optimize different definitions
- Trade-offs exist: Fairness improvements may reduce overall accuracy
- Group vs. individual fairness: Hard to optimize both simultaneously
        """,
        "source": "IBM AIF360 Documentation",
        "topics": ["mitigation", "technical solutions", "pre-processing", "in-processing"]
    },
    {
        "id": "hardt_equality_opportunity",
        "title": "Hardt et al. - Equality of Opportunity",
        "content": """
Hardt et al. define equality of opportunity as a fairness metric where the 
classifier has equal false positive rates and false negative rates across groups.

Definition:
- True positive rate (sensitivity) should be equal across groups
- False positive rate (1-specificity) should be equal across groups

Motivation:
- This metric ensures errors are not concentrated in one group
- Difference from demographic parity (equalized positive rates)
- Achievable even when base rates differ between groups

Limitations:
- May not satisfy other fairness definitions simultaneously
- Requires clear definition of protected groups
- Assumes error rates are equally important across groups
        """,
        "source": "Hardt et al., 2016",
        "topics": ["fairness metrics", "equal opportunity", "false positive rate", "error rates"]
    },
    {
        "id": "disparate_impact",
        "title": "Disparate Impact & the 80% Rule",
        "content": """
The 80% rule is a statistical test for detecting discrimination based on outcomes.

The 80% Rule:
- Impact ratio = (favorable outcome rate for minority) / (favorable outcome rate for majority)
- Rule: Ratio should be >= 0.8 (80% or more)
- Violation indicates possible disparate impact

Legal context:
- Developed from Civil Rights Act of 1964
- Can establish discrimination even without intent to discriminate
- Focus on outcomes, not intent
- Applies to both hiring and lending decisions

Example:
- If 100% of majority group gets approved, minority should get >= 80%
- If only 50% approved, this indicates disparate impact (ratio = 0.5)
- Investigation required to explain the difference

Important:
- Statistical test, not proof of intentional discrimination
- Can have legitimate justifications (business necessity)
- Must be evaluated in context
        """,
        "source": "EEOC Guidelines",
        "topics": ["disparate impact", "80% rule", "statistical test", "legal framework"]
    },
    {
        "id": "fairlearn_constraints",
        "title": "Fairlearn - Constraint-Based Fairness",
        "content": """
Fairlearn provides tools for building fair models with explicit constraints.

Constraints:
- Demographic parity: Positive rates should be equal across groups
- Equalized odds: False positive and negative rates should be equal
- Calibration: Probability predictions should be accurate within groups

Optimization approach:
- Formulate fairness as constraints in optimization
- Trade off fairness and accuracy using Pareto frontiers
- Generate multiple candidate models with different trade-offs

Key concepts:
- Sensitive features: Attributes defining protected groups
- Constraint violations: Measured differences from target fairness metric
- Slack variables: How much constraint violation is acceptable
- Sweep: Varying slack to explore accuracy-fairness trade-off

Practical guidance:
- Start by measuring current disparities (baseline assessment)
- Choose fairness metric aligned with use case
- Use cross-validation within groups
- Monitor fairness in production
        """,
        "source": "Fairlearn Documentation",
        "topics": ["constraint-based fairness", "threshold optimization", "pareto frontier"]
    },
    {
        "id": "shap_bias",
        "title": "SHAP - Bias Detection via Feature Importance",
        "content": """
SHAP (SHapley Additive exPlanations) can help identify which features contribute 
to biased predictions.

How SHAP identifies bias:
1. Compute SHAP values for each feature
2. Compare SHAP values across demographic groups
3. Features with large group differences indicate potential bias sources
4. Difference in feature impact = indicator of disparate treatment

Interpretation:
- High SHAP values = feature strongly influences prediction
- Group-specific SHAP differences = model treats groups differently
- Useful for understanding bias mechanisms (not just detecting disparate impact)

Advantages:
- Model-agnostic (works with any model)
- Individual-level explanations (why specific prediction biased)
- Theoretically grounded in Shapley values
- Connects feature importance to fairness

Limitations:
- Computational cost (expensive for large datasets)
- Doesn't prove causation
- Requires careful interpretation
        """,
        "source": "SHAP Documentation, Lundberg & Lee",
        "topics": ["SHAP", "feature importance", "bias detection", "explanations"]
    },
    {
        "id": "proxy_discrimination",
        "title": "Proxy Discrimination - Indirect Discrimination",
        "content": """
Proxy discrimination occurs when a model uses features that correlate with 
protected characteristics, enabling indirect discrimination.

Examples:
- Address correlated with race: Using zip code as proxy for race
- Education correlated with age: Using education as proxy for age discrimination
- Employment history correlated with disability: Using work history as proxy
- Credit score correlated with race: Wealth disparities created by past discrimination

Detection:
1. Correlation analysis: Check if features correlate with sensitive attributes
2. SHAP analysis: Compare feature importance across demographic groups
3. Performance testing: Check if model performance differs by protected characteristic
4. Causal analysis: Understand if feature has legitimate non-discriminatory use

Mitigation:
- Remove highly correlated features
- Use interpretable, non-proxying features only
- Apply fairness constraints
- Retrain without proxy features
- Document feature selection decisions
        """,
        "source": "Fairness in Machine Learning Research",
        "topics": ["proxy discrimination", "indirect discrimination", "feature selection"]
    }
]


class RAGService:
    """
    Retrieval-Augmented Generation service for fairness explanations.
    Maintains a knowledge base and retrieves relevant context for explainatons.
    """
    
    def __init__(self, db_path: str = "./chroma_fairness_db"):
        """
        Initialize RAG service with fairness knowledge base.
        
        Args:
            db_path: Path to store Chroma vector database
        """
        self.db_path = db_path
        # Use new Chroma client initialization (v0.4+)
        self.client = chromadb.EphemeralClient()  # Use in-memory for now
        
        # Initialize embedding model
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        
        # Initialize or load collection
        self.collection = None
        self._initialize_knowledge_base()
    
    def _initialize_knowledge_base(self):
        """Create and populate fairness knowledge base collection."""
        try:
            # Try to get existing collection
            try:
                self.collection = self.client.get_collection(name="fairness_kb")
                print(f"[INFO] Loaded existing knowledge base with {self.collection.count()} documents")
                return
            except:
                pass
            
            # Create new collection
            print(f"[INFO] Initializing new fairness knowledge base...")
            self.collection = self.client.create_collection(name="fairness_kb")
            
            # Add documents to collection
            docs = []
            ids = []
            metadatas = []
            
            for item in FAIRNESS_KNOWLEDGE_BASE:
                # Split long content into chunks
                chunks = self._chunk_text(item['content'], chunk_size=300)
                
                for i, chunk in enumerate(chunks):
                    chunk_id = f"{item['id']}_chunk_{i}"
                    docs.append(chunk)
                    ids.append(chunk_id)
                    metadatas.append({
                        "source_id": item['id'],
                        "title": item['title'],
                        "source": item['source'],
                        "topics": ", ".join(item['topics']),
                        "chunk_idx": str(i)
                    })
            
            # Add all documents at once
            if len(docs) > 0:
                self.collection.add(
                    ids=ids,
                    documents=docs,
                    metadatas=metadatas
                )
                print(f"[INFO] Knowledge base initialized with {len(ids)} document chunks")
            
        except Exception as e:
            print(f"[WARNING] Knowledge base initialization error: {e}")
    
    def _chunk_text(self, text: str, chunk_size: int = 300) -> List[str]:
        """Split text into overlapping chunks."""
        words = text.split()
        chunks = []
        
        for i in range(0, len(words), chunk_size):
            chunk = " ".join(words[i:i + chunk_size])
            chunks.append(chunk)
        
        return chunks if chunks else [text]
    
    def retrieve(self, query: str, n_results: int = 3) -> List[Dict]:
        """
        Retrieve relevant documents from knowledge base.
        
        Args:
            query: Search query (fairness question or bias description)
            n_results: Number of documents to retrieve
        
        Returns:
            list: Relevant documents with sources
        """
        try:
            # Use the new Chroma query API
            results = self.collection.query(
                query_texts=[query],
                n_results=min(n_results, max(1, self.collection.count()))
            )
            
            retrieved_docs = []
            
            if results and 'ids' in results and len(results['ids']) > 0:
                for i, doc_id in enumerate(results['ids'][0]):
                    doc_text = results['documents'][0][i] if results['documents'] else ""
                    metadata = results['metadatas'][0][i] if results['metadatas'] else {}
                    
                    retrieved_docs.append({
                        "document": doc_text,
                        "source_id": metadata.get('source_id', ''),
                        "title": metadata.get('title', ''),
                        "source": metadata.get('source', ''),
                        "topics": metadata.get('topics', ''),
                        "distance": results['distances'][0][i] if results['distances'] else 0
                    })
            
            return retrieved_docs
        
        except Exception as e:
            print(f"[ERROR] Retrieval failed: {e}")
            return []
    
    def augment_explanation(self, explanation: str, bias_context: str = "") -> Tuple[str, List[Dict]]:
        """
        Augment an explanation with retrieved fairness context.
        
        Args:
            explanation: Original bias explanation
            bias_context: Context about the bias (e.g., "proxy discrimination in hiring")
        
        Returns:
            tuple: (augmented_explanation, retrieved_documents)
        """
        # Create search query from explanation and context
        search_query = f"{bias_context} {explanation}" if bias_context else explanation
        
        # Retrieve relevant documents
        retrieved_docs = self.retrieve(search_query, n_results=3)
        
        # Create augmented explanation with sources
        augmented = explanation
        
        if retrieved_docs:
            augmented += "\n\n[AUTHORITATIVE CONTEXT]\n"
            
            for doc in retrieved_docs[:2]:  # Include top 2 sources
                if doc['document']:
                    augmented += f"\nSource: {doc['source']}\n"
                    augmented += f"Topic: {doc['topics']}\n"
                    # Include relevant snippet
                    snippet = doc['document'][:200] + "..." if len(doc['document']) > 200 else doc['document']
                    augmented += f"Context: {snippet}\n"
        
        return augmented, retrieved_docs
    
    def search_by_topic(self, topic: str, n_results: int = 5) -> List[Dict]:
        """Search knowledge base by fairness topic."""
        return self.retrieve(topic, n_results=n_results)
    
    def format_context_for_prompt(self, retrieved_docs: List[Dict]) -> str:
        """
        Format retrieved documents for inclusion in LLM prompts.
        
        Args:
            retrieved_docs: List of retrieved document dictionaries
        
        Returns:
            Formatted context string for prompts
        """
        if not retrieved_docs:
            return ""
        
        context_parts = []
        for i, doc in enumerate(retrieved_docs, 1):
            context_parts.append(
                f"[Source {i}: {doc.get('source', 'Unknown')}]\n"
                f"Title: {doc.get('title', '')}\n"
                f"Content: {doc.get('document', '')[:300]}...\n"
            )
        
        return "\n---\n".join(context_parts)
