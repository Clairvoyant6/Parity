import requests
import json

# Test health endpoint
print("Testing /api/health endpoint...")
response = requests.get("http://localhost:8000/api/health")
print(f"Status: {response.status_code}")
print(f"Response: {response.json()}\n")

# Test analyze endpoint with COMPAS dataset
print("Testing /api/analyze endpoint with COMPAS data...")
with open("datasets/compas-scores-two-years.csv", "rb") as f:
    files = {"file": f}
    data = {
        "target_column": "two_year_recid",
        "sensitive_columns": "race,sex",
        "domain": "criminal_justice"
    }
    response = requests.post("http://localhost:8000/api/analyze", files=files, data=data)

print(f"Status: {response.status_code}")
result = response.json()
print(f"\nResponse keys: {result.keys()}")

if result.get("status") == "success":
    print("✅ Analysis completed successfully!")
    results = result.get("results", {})
    print(f"\nBias Risk Score: {results.get('bias_risk_score')}/100")
    print(f"Risk Level: {results.get('risk_level')}")
    print(f"Dataset Size: {results.get('dataset_size')}")
    print(f"Model Accuracy: {results.get('model_accuracy')}")
    
    # Check for explanation
    if "explanation" in results:
        print(f"\n✨ AI Explanation (from Groq/Llama3):")
        print(results["explanation"][:500] + "..." if len(results.get("explanation", "")) > 500 else results.get("explanation"))
    else:
        print("\n⚠️ No explanation field in results")
else:
    print(f"❌ Analysis failed: {result.get('detail', 'Unknown error')}")
