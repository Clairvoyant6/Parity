from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api.routes import router
from app.core.database import engine, Base
import os

# Create database tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Parity API",
    description="AI Bias Detection & Fairness Auditing Backend",
    version="1.0.0"
)

# Allow React frontend to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")

# Serve datasets directory so the frontend demo button can load the COMPAS CSV
datasets_dir = os.path.join(os.path.dirname(__file__), "datasets")
if os.path.isdir(datasets_dir):
    app.mount("/datasets", StaticFiles(directory=datasets_dir), name="datasets")

@app.get("/")
def root():
    return {"message": "Parity Backend Running. Visit /docs for API documentation."}

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "parity-backend"}