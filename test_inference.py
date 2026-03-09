import pandas as pd
import pickle
import json
import os
from pathlib import Path

def test_inference():
    model_dir = Path(os.getcwd()) / "backend" / "models"
    model_path = model_dir / "xgboost_solar_model.pkl"
    feature_path = model_dir / "feature_columns.json"
    
    if not model_path.exists():
        print("Model not found!")
        return
        
    with open(model_path, "rb") as f:
        model = pickle.load(f)
        
    with open(feature_path, "r") as f:
        expected_features = json.load(f)
        
    csv_paths = list(Path(os.getcwd()).glob("*.csv")) + list(Path(os.getcwd()).glob("*/*.csv"))
    print(f"Found CSVs: {csv_paths}")
    
    for cp in csv_paths:
        if "REAL" in str(cp) or "demo" in str(cp) or "Copy" in str(cp):
            print(f"Testing {cp}")
            df = pd.read_csv(cp)
            
            # Align
            for col in expected_features:
                if col not in df.columns:
                    df[col] = 0.0
            X = df[expected_features]
            
            probs = model.predict_proba(X)[:, 1]
            print(f"Probabilities (first 10): {probs[:10]}")
            print(f"Probabilities (last 10): {probs[-10:]}")
            print(f"Max prob: {probs.max()}, Min prob: {probs.min()}")
            break

if __name__ == "__main__":
    test_inference()
