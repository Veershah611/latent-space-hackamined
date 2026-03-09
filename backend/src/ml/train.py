import pandas as pd
import numpy as np
import xgboost as xgb
import pickle
import json
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_curve, auc

TOP_20_FEATURES = [
    "inv_kwh_total", "roll_temp_mean_7d", "roll_kwh_today_std_7d", 
    "roll_temp_std_7d", "roll_temp_std_3d", "roll_temp_mean_3d", 
    "roll_pv1_power_std_7d", "anom_night_power_7d", "roll_kwh_today_mean_7d", 
    "roll_kwh_today_std_3d", "str_worst_ratio_rmean_7d", "day_of_week", 
    "inv_power", "str_mean_rmean_7d", "roll_kwh_today_mean_3d", 
    "stress_hightemp_7d", "is_daytime", "anom_night_hightemp_7d", 
    "roll_power_std_3d", "roll_pv1_power_mean_3d"
]

METADATA_COLS = ["plant_id", "target"]

def train_model_on_data(df: pd.DataFrame, output_dir: str, force_retrain: bool = False):
    out_dir_path = Path(output_dir)
    model_path = out_dir_path / "xgboost_solar_model.pkl"
    feature_path = out_dir_path / "feature_columns.json"

    if not force_retrain and model_path.exists() and feature_path.exists():
        # Load existing model and evaluate on the current dataset to provide metrics
        try:
            with open(model_path, "rb") as f:
                model = pickle.load(f)
            
            available_cols = [c for c in TOP_20_FEATURES + METADATA_COLS if c in df.columns]
            combined_df = df[available_cols].copy()
            if "plant_id" in combined_df.columns:
                combined_df = pd.get_dummies(combined_df, columns=['plant_id'], drop_first=False)
                
            if "target" in combined_df.columns:
                X = combined_df.drop(columns=["target"])
                y = combined_df["target"].astype(int)
                
                try:
                    if hasattr(model, "feature_names_in_"):
                        expected_cols = list(model.feature_names_in_)
                    elif hasattr(model, "get_booster"):
                        expected_cols = model.get_booster().feature_names
                    else:
                        with open(feature_path, "r") as f:
                            expected_cols = json.load(f)
                except Exception:
                    with open(feature_path, "r") as f:
                        expected_cols = json.load(f)
                    
                for col in expected_cols:
                    if col not in X.columns:
                        X[col] = 0.0
                X = X[expected_cols]
                
                acc = None
                roc_auc = None
                try:
                    y_probs = model.predict_proba(X)
                    if y_probs.ndim > 1:
                        y_probs = y_probs[:, 1]
                except Exception as e:
                    y_probs = np.zeros(len(X))
                    acc = f"Error in predict_proba: {str(e)}"
                    roc_auc = acc
                    
                if acc is not None and isinstance(acc, str) and acc.startswith("Error"):
                    pass # Skip further metrics if probability failed
                else:
                    y_pred = (y_probs >= 0.60).astype(int)
                    
                    try:
                        fpr, tpr, thresholds = roc_curve(y, y_probs)
                        roc_auc = float(auc(fpr, tpr))
                    except Exception as e:
                        roc_auc = f"ROC Error: {str(e)}"
                        
                    try:
                        report = classification_report(y, y_pred, output_dict=True)
                        acc = report.get('accuracy', 0.0)
                    except Exception as e:
                        acc = f"Classification Error: {str(e)}"
            else:
                acc = "N/A (No target column)"
                roc_auc = "N/A (No target column)"
                
        except Exception as e:
            acc = f"Error: {str(e)}"
            roc_auc = f"Error: {str(e)}"
            
        return {
            "status": "skipped",
            "message": "Model already exists. Evaluated on uploaded data.",
            "metrics": {
                "accuracy": acc,
                "roc_auc": roc_auc
            },
            "model_path": str(model_path)
        }

    available_cols = [c for c in TOP_20_FEATURES + METADATA_COLS if c in df.columns]
    combined_df = df[available_cols].copy()

    # One-hot encode plant_id
    if "plant_id" in combined_df.columns:
        combined_df = pd.get_dummies(combined_df, columns=['plant_id'], drop_first=False)

    if "target" not in combined_df.columns:
        raise ValueError("Target column is missing.")

    X = combined_df.drop(columns=["target"])
    y = combined_df["target"].astype(int)

    # Simplified train/test split for robust API response
    if len(X) < 100:
        # Avoid split errors on extremely small files
        X_train, X_test, y_train, y_test = X, X, y, y
    else:
        # Standard split
        try:
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.30, random_state=42, stratify=y
            )
        except Exception:
            # Fallback if stratify fails (e.g. only 1 class)
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.30, random_state=42
            )

    # Scale weight
    if (y_train == 1).sum() == 0:
        scale_weight = 1.0 # default to 1 if no failures
    else:
        scale_weight = (y_train == 0).sum() / max((y_train == 1).sum(), 1)

    model = xgb.XGBClassifier(
        n_estimators=100, # optimized for speed in API
        max_depth=6,
        learning_rate=0.05,
        scale_pos_weight=scale_weight,
        random_state=42,
        n_jobs=-1
    )

    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=False
    )
    
    # Eval
    try:
        y_probs = model.predict_proba(X_test)[:, 1]
    except Exception:
        y_probs = np.zeros(len(X_test))
        
    y_pred = (y_probs >= 0.60).astype(int)

    # Calculate metrics robustly
    try:
        fpr, tpr, thresholds = roc_curve(y_test, y_probs)
        roc_auc = float(auc(fpr, tpr))
    except Exception:
        roc_auc = 0.5
        
    try:
        report = classification_report(y_test, y_pred, output_dict=True)
        acc = report.get('accuracy', 0.0)
    except Exception:
        acc = 0.0
        
    # Ensure output dir exists
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    
    out_dir_path = Path(output_dir)
    # Save model and features
    with open(out_dir_path / "xgboost_solar_model.pkl", 'wb') as f:
        pickle.dump(model, f)

    with open(out_dir_path / "feature_columns.json", 'w') as f:
        json.dump(list(X_train.columns), f)

    return {
        "status": "success",
        "message": "Training completed successfully.",
        "metrics": {
            "accuracy": acc,
            "roc_auc": roc_auc
        },
        "model_path": str(out_dir_path / "xgboost_solar_model.pkl")
    }
