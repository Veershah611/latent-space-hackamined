import requests

# We have `generate_mock_csv.py` in the root folder according to user context
# Let's just create a very simple dummy CSV for testing
csv_content = """inverters[0].inv_power,inverters[0].inv_temp
10.5,45.2
0.0,30.1
"""

with open("test_predict.csv", "w") as f:
    f.write(csv_content)

response = requests.post(
    "http://127.0.0.1:8000/predict_csv",
    files={"file": ("test_predict.csv", open("test_predict.csv", "rb"), "text/csv")}
)

print(f"Status Code: {response.status_code}")
print(f"Response: {response.text}")
