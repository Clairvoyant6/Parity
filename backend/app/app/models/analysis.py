from sqlalchemy import Column, Integer, String, Text, DateTime, Float
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    target_column = Column(String, nullable=False)
    sensitive_columns = Column(String, nullable=False)   # comma-separated
    bias_risk_score = Column(Float, nullable=True)
    metrics_json = Column(Text, nullable=True)           # JSON string
    explanation = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)