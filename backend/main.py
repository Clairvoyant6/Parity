from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api.routes import router
from app.core.database import engine, Base
from app.models import analysis as _analysis_model  # noqa: F401
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

# Serve datasets directory
project_root = os.path.dirname(os.path.dirname(__file__))
datasets_candidates = [
    os.path.join(project_root, "public", "datasets"),
    os.path.join(os.path.dirname(__file__), "datasets"),
]
for datasets_dir in datasets_candidates:
    if os.path.isdir(datasets_dir):
        app.mount("/datasets", StaticFiles(directory=datasets_dir), name="datasets")
        break

# Production: Serve React Frontend
# We look for the 'dist' folder which will be copied into the container
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "dist")

if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
    
    # Catch-all route to handle React Router (SPA) deep links
    @app.exception_handler(404)
    async def not_found_exception_handler(request, exc):
        if request.url.path.startswith("/api"):
            return JSONResponse(status_code=404, content={"detail": "Not Found"})
        return FileResponse(os.path.join(frontend_dir, "index.html"))
else:
    @app.get("/")
    def root():
        return {"message": "Parity API is running. (Frontend 'dist' not found, serving API only)"}
