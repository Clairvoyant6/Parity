from io import BytesIO


def _csv_file():
    return {
        "file": ("sample.csv", BytesIO(b"target,sensitive,feature\n1,A,10\n0,B,20\n"), "text/csv")
    }


def test_rejects_empty_sensitive_columns(client):
    response = client.post(
        "/api/analyze",
        data={
            "target_column": "target",
            "sensitive_columns": "sensitive,,feature",
            "domain": "general",
        },
        files=_csv_file(),
    )

    assert response.status_code == 400
    assert "empty column names" in response.json()["detail"]


def test_rejects_duplicate_sensitive_columns(client):
    response = client.post(
        "/api/analyze",
        data={
            "target_column": "target",
            "sensitive_columns": "sensitive,sensitive",
            "domain": "general",
        },
        files=_csv_file(),
    )

    assert response.status_code == 400
    assert "duplicate column names" in response.json()["detail"]


def test_rejects_missing_sensitive_columns(client):
    response = client.post(
        "/api/analyze",
        data={
            "target_column": "target",
            "sensitive_columns": "sensitive,missing",
            "domain": "general",
        },
        files=_csv_file(),
    )

    assert response.status_code == 400
    detail = response.json()["detail"]
    assert detail["missing_columns"] == ["missing"]
