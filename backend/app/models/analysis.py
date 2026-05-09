import json
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Float
from app.core.database import Base


class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(String(64), unique=True, index=True, nullable=False)
    filename = Column(String, nullable=False)
    target_column = Column(String, nullable=False)
    sensitive_columns_json = Column(Text, nullable=False)
    domain = Column(String, nullable=False, default="general")
    bias_risk_score = Column(Float, nullable=True)
    metrics_json = Column(Text, nullable=False)
    explanation = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    @property
    def sensitive_columns(self) -> list[str]:
        try:
            return json.loads(self.sensitive_columns_json)
        except Exception:
            return []
