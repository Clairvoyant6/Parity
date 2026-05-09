from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import declarative_base, sessionmaker
from pathlib import Path
import os
from app.core.config import settings

Base = declarative_base()


def _normalize_database_url(database_url: str) -> str:
    if not database_url.startswith("sqlite"):
        return database_url

    url = make_url(database_url)
    if not url.database or url.database == ":memory:":
        return database_url

    db_path = Path(url.database)
    if not db_path.is_absolute():
        backend_root = Path(__file__).resolve().parents[2]
        db_path = (backend_root / db_path).resolve()

    db_path.parent.mkdir(parents=True, exist_ok=True)
    if db_path.exists() and not os.access(db_path, os.W_OK):
        db_path.chmod(db_path.stat().st_mode | 0o600)

    return str(url.set(database=str(db_path)))


def _create_engine(database_url: str):
    database_url = _normalize_database_url(database_url)
    engine_kwargs = {}
    if database_url.startswith("sqlite"):
        engine_kwargs["connect_args"] = {"check_same_thread": False}
    return create_engine(database_url, **engine_kwargs)


engine = _create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
