from io import BytesIO


def test_successful_analysis_is_persisted_and_retrievable(client, monkeypatch):
    from app.api import routes

    async def fake_explanation(metrics, sensitive_columns, domain):
        return {
            "explanation": "Stub explanation",
            "citations": ["citation-1"],
            "sources": ["source-1"],
        }

    monkeypatch.setattr(
        routes,
        "compute_bias_metrics",
        lambda df, target_column, sensitive_columns: {
            "bias_risk_score": 42.5,
            "risk_level": "MEDIUM",
            "model_accuracy": 0.91,
            "group_metrics": {},
            "feature_importance": [],
            "proxy_flags": [],
        },
    )
    monkeypatch.setattr(routes, "generate_explanation", fake_explanation)

    response = client.post(
        "/api/analyze",
        data={
            "target_column": "target",
            "sensitive_columns": "sensitive",
            "domain": "general",
        },
        files={
            "file": ("sample.csv", BytesIO(b"target,sensitive,feature\n1,A,10\n0,B,20\n"), "text/csv"),
        },
    )

    assert response.status_code == 200
    payload = response.json()
    analysis_id = payload["analysis_id"]
    assert analysis_id
    assert payload["results"]["bias_risk_score"] == 42.5
    assert payload["results"]["explanation"] == "Stub explanation"

    list_response = client.get("/api/analyses")
    assert list_response.status_code == 200
    analyses = list_response.json()["analyses"]
    assert len(analyses) == 1
    assert analyses[0]["analysis_id"] == analysis_id

    detail_response = client.get(f"/api/analyses/{analysis_id}")
    assert detail_response.status_code == 200
    detail = detail_response.json()
    assert detail["analysis_id"] == analysis_id
    assert detail["results"]["bias_risk_score"] == 42.5
    assert detail["explanation"] == "Stub explanation"
