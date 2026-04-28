from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router
from app.core.database import engine, Base

# Create database tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="FairLens API",
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

@app.get("/")
def root():
    return {"message": "FairLens Backend Running. Visit /docs for API documentation."}