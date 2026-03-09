import pickle
import pandas as pd
import shap
from pathlib import Path

MODEL_PATH = Path("backend/models/xgboost_solar_model.pkl")

print(f"Loading {MODEL_PATH}...")
with open(MODEL_PATH, "rb") as f:
    model = pickle.load(f)

print(f"Model loaded. Type: {type(model)}")

# create dummy df
df = pd.DataFrame([{"feat1": 0.0}])

try:
    print("Initializing TreeExplainer...")
    explainer = shap.TreeExplainer(model)
    print("TreeExplainer initialized.")
except Exception as e:
    print(f"Failed to initialize TreeExplainer: {e}")
