from __future__ import annotations

import importlib
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


@pytest.fixture()
def client(tmp_path, monkeypatch):
    db_path = tmp_path / "test.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path}")

    for module_name in [
        "main",
        "app.api.routes",
        "app.services.analysis_repository",
        "app.services.dataset_catalog",
        "app.models.analysis",
        "app.core.database",
        "app.core.config",
    ]:
        sys.modules.pop(module_name, None)

    config = importlib.import_module("app.core.config")
    database = importlib.import_module("app.core.database")
    importlib.import_module("app.models.analysis")

    database.Base.metadata.create_all(bind=database.engine)
    main_module = importlib.import_module("main")

    return TestClient(main_module.app)
