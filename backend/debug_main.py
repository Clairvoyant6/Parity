import sys
import os

# Set up the path
sys.path.insert(0, os.getcwd())

print(f"Current directory: {os.getcwd()}")
print(f"Python path: {sys.path[:3]}")

try:
    print("\n1. Importing FastAPI...")
    from fastapi import FastAPI
    print("   ✓ FastAPI imported")
except Exception as e:
    print(f"   ✗ Failed: {e}")
    import traceback
    traceback.print_exc()

try:
    print("\n2. Importing CORSMiddleware...")
    from fastapi.middleware.cors import CORSMiddleware
    print("   ✓ CORSMiddleware imported")
except Exception as e:
    print(f"   ✗ Failed: {e}")

try:
    print("\n3. Importing app.api.routes...")
    from app.api.routes import router
    print("   ✓ router imported")
except Exception as e:
    print(f"   ✗ Failed: {e}")
    import traceback
    traceback.print_exc()

try:
    print("\n4. Importing app.core.database...")
    from app.core.database import engine, Base
    print("   ✓ engine, Base imported")
except Exception as e:
    print(f"   ✗ Failed: {e}")
    import traceback
    traceback.print_exc()

try:
    print("\n5. Importing main module directly...")
    import main
    print(f"   ✓ main imported")
    print(f"   main.app = {main.app}")
except Exception as e:
    print(f"   ✗ Failed: {e}")
    import traceback
    traceback.print_exc()
