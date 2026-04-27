import sys
import traceback

sys.path.insert(0, '.')

print("Attempting to import routes module...")
try:
    exec(open('app/api/routes.py').read())
except Exception as e:
    print(f"Error: {e}")
    traceback.print_exc()
