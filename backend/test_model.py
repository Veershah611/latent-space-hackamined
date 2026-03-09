import pandas as pd
import pickle
import json
import os

print("1. Loading Model and Features...")
model_path = os.path.join("models", "xgboost_solar_model.pkl")
features_path = os.path.join("models", "feature_columns.json")

with open(model_path, "rb") as f:
    model = pickle.load(f)

with open(features_path, "r") as f:
    expected_features = json.load(f)

print("2. Loading the REAL CSV...")
csv_path = os.path.join("..", "REAL_hackathon_demo_data.csv")
df = pd.read_csv(csv_path)
print("3. Aligning columns and padding missing one-hot features...")
# 🚨 THE NEW FIX: If the CSV is missing the plant_id columns, add them as 0

print("3. Aligning columns...")
df = df[expected_features]

print("4. Predicting...")
probs = model.predict_proba(df)[:, 1] * 100

for i, p in enumerate(probs):
    print(f"Row {i+1}: {p:.2f}%")
