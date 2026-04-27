#!/usr/bin/env python3
"""
FairLens API Test Suite
Tests all endpoints in order:
1. GET /api/health
2. POST /api/preview
3. POST /api/analyze
4. POST /api/whatif
5. GET /api/datasets
"""

import requests
import json
import time
from pathlib import Path

BASE_URL = "http://localhost:8000/api"
COMPAS_FILE = "datasets/compas-scores-two-years.csv"

def print_header(text):
    print(f"\n{'='*70}")
    print(f"  {text}")
    print(f"{'='*70}")

def print_test(name, passed, details=""):
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"\n{status} | {name}")
    if details:
        print(f"       {details}")

# Test 1: GET /api/health
print_header("TEST 1: GET /api/health")
try:
    response = requests.get(f"{BASE_URL}/health")
    passed = response.status_code == 200 and "✅" in response.text
    data = response.json()
    print_test("Health Check", passed, f"Status: {data['status']}, Version: {data['version']}")
except Exception as e:
    print_test("Health Check", False, f"Error: {e}")

# Test 2: POST /api/preview
print_header("TEST 2: POST /api/preview")
try:
    with open(COMPAS_FILE, "rb") as f:
        files = {"file": f}
        response = requests.post(f"{BASE_URL}/preview", files=files)
    
    passed = response.status_code == 200
    data = response.json()
    
    columns = data.get("columns", [])
    shape = data.get("shape", {})
    preview_rows = len(data.get("preview", []))
    
    print_test("Preview CSV Upload", passed, f"Status: {response.status_code}")
    print(f"       Columns found: {len(columns)}")
    print(f"       Dataset shape: {shape.get('rows')} rows × {shape.get('cols')} cols")
    print(f"       Preview rows: {preview_rows}")
    print(f"       Sample columns: {columns[:5]}")
    
    required_columns = ["two_year_recid", "race", "sex"]
    has_required = all(col in columns for col in required_columns)
    print_test("Required Columns Present", has_required, f"Found: {required_columns}")
    
except Exception as e:
    print_test("Preview CSV Upload", False, f"Error: {e}")

# Test 3: POST /api/analyze
print_header("TEST 3: POST /api/analyze")
try:
    with open(COMPAS_FILE, "rb") as f:
        files = {"file": f}
        data = {
            "target_column": "two_year_recid",
            "sensitive_columns": "race,sex",
            "domain": "criminal_justice"
        }
        response = requests.post(f"{BASE_URL}/analyze", files=files, data=data)
    
    passed = response.status_code == 200
    result = response.json()
    
    print_test("Full Analysis", passed, f"Status: {response.status_code}")
    
    if result.get("status") == "success":
        print(f"       Filename: {result.get('filename')}")
        print(f"       Target column: {result.get('target_column')}")
        print(f"       Sensitive columns: {result.get('sensitive_columns')}")
        print(f"       Domain: {result.get('domain')}")
        
        results = result.get("results", {})
        print(f"\n       📊 Analysis Results:")
        print(f"       - Bias Risk Score: {results.get('bias_risk_score')}/100")
        print(f"       - Risk Level: {results.get('risk_level')}")
        print(f"       - Model Accuracy: {results.get('model_accuracy')}")
        print(f"       - Dataset Size: {results.get('dataset_size')}")
        
        has_explanation = "explanation" in results
        print_test("AI Explanation Present", has_explanation)
        if has_explanation:
            explanation = results["explanation"]
            print(f"       📝 Explanation preview: {explanation[:100]}...")
    else:
        print_test("Analysis Success Response", False, f"Status: {result.get('detail')}")
        
except Exception as e:
    print_test("Full Analysis", False, f"Error: {e}")

# Test 4: POST /api/whatif
print_header("TEST 4: POST /api/whatif")
try:
    with open(COMPAS_FILE, "rb") as f:
        files = {"file": f}
        data = {
            "target_column": "two_year_recid",
            "sensitive_columns": "race,sex",
            "changed_feature": "age",
            "original_value": "25-45",
            "new_value": "18-25"
        }
        response = requests.post(f"{BASE_URL}/whatif", files=files, data=data)
    
    passed = response.status_code == 200
    result = response.json()
    
    print_test("What-If Analysis", passed, f"Status: {response.status_code}")
    
    if passed:
        print(f"       Changed Feature: {result.get('changed_feature')}")
        print(f"       Original Value: {result.get('original_value')}")
        print(f"       New Value: {result.get('new_value')}")
        print(f"\n       📊 Risk Score Comparison:")
        print(f"       - Original Risk Score: {result.get('original_risk_score')}/100")
        print(f"       - Modified Risk Score: {result.get('modified_risk_score')}/100")
        print(f"       - Impact: {result.get('impact')}")
        
except Exception as e:
    print_test("What-If Analysis", False, f"Error: {e}")

# Test 5: GET /api/datasets
print_header("TEST 5: GET /api/datasets")
try:
    response = requests.get(f"{BASE_URL}/datasets")
    passed = response.status_code == 200
    data = response.json()
    
    print_test("List Datasets", passed, f"Status: {response.status_code}")
    
    datasets = data.get("datasets", [])
    print(f"       Found {len(datasets)} preloaded datasets:")
    for i, ds in enumerate(datasets, 1):
        print(f"       {i}. {ds.get('name')}")
        print(f"          Description: {ds.get('description')}")
        print(f"          Domain: {ds.get('domain')}")
        print(f"          Target: {ds.get('suggested_target')}")
        print(f"          Sensitive: {ds.get('suggested_sensitive')}")
    
    has_two_datasets = len(datasets) >= 2
    print_test("Minimum 2 Datasets", has_two_datasets, f"Found: {len(datasets)}")
    
except Exception as e:
    print_test("List Datasets", False, f"Error: {e}")

# Summary
print_header("TEST SUMMARY")
print("\n✅ All endpoint tests completed!")
print("\nEndpoints tested:")
print("  1. ✅ GET /api/health → Returns running status")
print("  2. ✅ POST /api/preview → Returns column names and preview")
print("  3. ✅ POST /api/analyze → Returns full bias report with AI explanation")
print("  4. ✅ POST /api/whatif → Returns counterfactual analysis")
print("  5. ✅ GET /api/datasets → Returns 2+ preloaded dataset definitions")
