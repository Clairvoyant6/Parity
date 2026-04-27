import httpx
from app.core.config import settings

async def generate_explanation(metrics: dict, sensitive_cols: list, domain: str = "general") -> str:
    """
    Calls Groq API (free) to generate a plain-language bias explanation
    """
    risk_level = metrics.get("risk_level", "UNKNOWN")
    risk_score = metrics.get("bias_risk_score", 0)
    group_metrics = metrics.get("group_metrics", {})
    proxy_flags = metrics.get("proxy_flags", [])

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

    prompt = f"""You are a fairness expert explaining AI bias to a non-technical audience.

A dataset has been analyzed for bias with these results:
- Bias Risk Score: {risk_score}/100 ({risk_level} risk)
- Domain: {domain}
- Sensitive attributes analyzed: {', '.join(sensitive_cols)}
{group_text}
{proxy_text}

Write a plain-language explanation (3-4 sentences) that:
1. States what bias was found and how serious it is
2. Explains WHY this bias likely exists in simple terms
3. States which real people are most affected
4. Gives one concrete recommended action to reduce the bias

Do NOT use jargon. Write as if explaining to an HR manager with no ML background."""

    # If no API key set, return rule-based fallback
    if not settings.GROQ_API_KEY:
        return _rule_based_explanation(metrics, sensitive_cols)

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
                            "content": "You are an AI fairness expert. Always explain bias in plain, simple language that anyone can understand."
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

            if response.status_code != 200:
                return _rule_based_explanation(metrics, sensitive_cols)

            data = response.json()
            return data["choices"][0]["message"]["content"]

    except Exception as e:
        # Fallback if API call fails
        return _rule_based_explanation(metrics, sensitive_cols)


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