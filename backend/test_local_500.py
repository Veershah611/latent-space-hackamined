from fastapi.testclient import TestClient
from src.api.main import app
import json

client = TestClient(app)

def test_explain():
    payload = {
        "inverter_id": "INV-TEST-999",
        "risk_score": 0.88,
        "risk_label": "HIGH",
        "top_features": [
            {"feature": "temp", "shap_value": 0.4}
        ]
    }
    response = client.post("/explain", json=payload)
    print("Explain Status:", response.status_code)
    print("Explain Response:", response.text)

if __name__ == '__main__':
    test_explain()
