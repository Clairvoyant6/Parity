import sys
sys.path.insert(0, r'c:\Users\Admin\OneDrive\Desktop\fairlens\backend')

# Test imports step by step
print("Testing imports...")

try:
    import app
    print("✓ app imported")
except Exception as e:
    print(f"✗ app import failed: {e}")
    sys.exit(1)

try:
    import app.services
    print("✓ app.services imported")
except Exception as e:
    print(f"✗ app.services import failed: {e}")
    sys.exit(1)

try:
    import app.services.bias_engine
    print("✓ app.services.bias_engine module imported")
    print(f"  Functions: {[x for x in dir(app.services.bias_engine) if not x.startswith('_')]}")
except Exception as e:
    print(f"✗ app.services.bias_engine import failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

try:
    from app.services.bias_engine import compute_bias_metrics
    print("✓ compute_bias_metrics imported successfully")
except Exception as e:
    print(f"✗ compute_bias_metrics import failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\nAll imports successful!")
