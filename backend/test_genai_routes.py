import requests
import json
import time

def test_explain():
    print("Testing /explain endpoint...")
    payload = {
        "inverter_id": "INV-TEST-999",
        "risk_score": 0.88,
        "risk_label": "HIGH",
        "top_features": [
            {"feature": "temp_7d_rolling_max", "shap_value": 0.4},
            {"feature": "pr_trend_7d", "shap_value": -0.2}
        ]
    }
    try:
        start_time = time.time()
        res = requests.post("http://127.0.0.1:8000/explain", json=payload)
        duration = time.time() - start_time
        print(f"Status: {res.status_code} (took {duration:.2f}s)")
        try:
            print("Response:", json.dumps(res.json(), indent=2))
        except:
            print("Raw text:", res.text)
        print("-" * 50)
    except Exception as e:
        print(f"Failed to connect to /explain: {e}")

def test_query():
    print("Testing /query endpoint...")
    payload = {
        "question": "What are the common causes for a sustained rise in solar inverter operating temperature?"
    }
    try:
        start_time = time.time()
        res = requests.post("http://127.0.0.1:8000/query", json=payload)
        duration = time.time() - start_time
        print(f"Status: {res.status_code} (took {duration:.2f}s)")
        try:
            print("Response:", json.dumps(res.json(), indent=2))
        except:
            print("Raw text:", res.text)
        print("-" * 50)
    except Exception as e:
        print(f"Failed to connect to /query: {e}")

if __name__ == '__main__':
    test_explain()
    test_query()

