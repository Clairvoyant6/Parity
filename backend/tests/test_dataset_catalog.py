def test_dataset_catalog_returns_all_public_csvs(client):
    response = client.get("/api/datasets")

    assert response.status_code == 200
    payload = response.json()
    datasets = payload["datasets"]

    assert len(datasets) == 10

    expected_files = {
        "adult-income.csv",
        "compas-scores-two-years.csv",
        "fraud-review.csv",
        "german-credit.csv",
        "heart-disease.csv",
        "mortgage-approval.csv",
        "resume-screening.csv",
        "scholarship-awards.csv",
        "sepsis-triage.csv",
        "student-performance.csv",
    }
    assert {dataset["filename"] for dataset in datasets} == expected_files

    for dataset in datasets:
        assert dataset["available_columns"]
        assert dataset["suggested_target_column"] in dataset["available_columns"]
        assert set(dataset["suggested_sensitive_columns"]).issubset(dataset["available_columns"])
        assert dataset["metadata"]["column_count"] == len(dataset["available_columns"])
        assert dataset["download_url"] == f"/datasets/{dataset['filename']}"
