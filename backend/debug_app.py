import sys
import traceback

print("Step 1: Import FastAPI...")
try:
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
    print("  ✓ Successfully imported FastAPI")
except Exception as e:
    print(f"  ✗ Failed: {e}")
    traceback.print_exc()
    sys.exit(1)

print("\nStep 2: Import routes...")
try:
    from app.api.routes import router
    print("  ✓ Successfully imported router")
except Exception as e:
    print(f"  ✗ Failed: {e}")
    traceback.print_exc()
    sys.exit(1)

print("\nStep 3: Import database...")
try:
    from app.core.database import engine, Base
    print("  ✓ Successfully imported engine, Base")
except Exception as e:
    print(f"  ✗ Failed: {e}")
    traceback.print_exc()
    sys.exit(1)

print("\nStep 4: Create app...")
try:
    Base.metadata.create_all(bind=engine)
    app = FastAPI(
        title="FairLens API",
        description="AI Bias Detection & Fairness Auditing Backend",
        version="1.0.0"
    )
    print("  ✓ App created successfully")
except Exception as e:
    print(f"  ✗ Failed: {e}")
    traceback.print_exc()
    sys.exit(1)

print("\nStep 5: Add middleware...")
try:
    app.add_middleware(
       CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://localhost:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    print("  ✓ Middleware added")
except Exception as e:
    print(f"  ✗ Failed: {e}")
    traceback.print_exc()
    sys.exit(1)

print("\nStep 6: Include router...")
try:
    app.include_router(router, prefix="/api")
    print("  ✓ Router included")
except Exception as e:
    print(f"  ✗ Failed: {e}")
    traceback.print_exc()
    sys.exit(1)

print("\nStep 7: Add root route...")
try:
    @app.get("/")
    def root():
        return {"message": "FairLens Backend Running. Visit /docs for API documentation."}
    print("  ✓ Root route added")
except Exception as e:
    print(f"  ✗ Failed: {e}")
    traceback.print_exc()
    sys.exit(1)

print("\nAll steps completed successfully!")
print(f"App object: {app}")
