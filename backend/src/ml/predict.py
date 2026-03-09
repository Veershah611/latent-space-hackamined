import pandas as pd
from typing import Dict, Any
from src.api.schemas import FeatureExplanation

def run_prediction(model: Any, features: Dict[str, Any]) -> Dict[str, Any]:
    """
    Run the prediction using the provided model and features.
    """
    risk_score = 0.0
    shap_values = []
    
    # Check if the model is MockModel or XGBoost
    if hasattr(model, 'predict_proba') or type(model).__name__ == 'MockModel':
        try:
            # XGBoost requires Pandas DataFrame with specific feature names
            df = pd.DataFrame([features])
            
            try:
                if hasattr(model, "feature_names_in_"):
                    expected_cols = list(model.feature_names_in_)
                elif hasattr(model, "get_booster"):
                    expected_cols = model.get_booster().feature_names
                else:
                    expected_cols = []
                
                if expected_cols:
                    for col in expected_cols:
                        if col not in df.columns:
                            df[col] = 0.0
                    df = df[expected_cols]
                    
                    if hasattr(model, "feature_types_in_"):
                        for col, dtype in zip(model.feature_names_in_, model.feature_types_in_):
                            if col in df.columns:
                                try:
                                    df[col] = df[col].astype(dtype)
                                except Exception:
                                    df[col] = df[col].astype(float)
                    else:
                        df = df.astype(float)
            except Exception:
                pass
            
            print("\n" + "="*40)
            print("BACKEND DIAGNOSTICS (run_prediction)")
            print("="*40)
            print(f"Data Shape: {df.shape}")
            missing_vals = df.isna().sum().sum()
            print(f"Total Missing/NaN Values: {missing_vals}")
            print(f"\nData Types:\n{df.dtypes.value_counts()}")
            if not df.empty:
                print(f"\nFirst Row Values:\n{df.iloc[0].to_dict()}")
            print("="*40 + "\n")

            df = df.apply(pd.to_numeric, errors='coerce').fillna(0)

            if hasattr(model, 'predict_proba'):
                # Binary classification, assume proba for class 1 (failure)
                result = model.predict_proba(df)
                risk_score = float(result[0][1])
            else:
                # Fallback to direct predict
                result = model.predict(df)
                if isinstance(result, (list, tuple)) or hasattr(result, 'flatten'):
                    risk_score = float(result[0])
                else:
                    risk_score = float(result)
        except Exception as e:
            print(f"Prediction error in single: {e}")
            if hasattr(model, 'predict'):
                try:
                    risk_score = float(model.predict(features))
                except Exception as e2:
                    print(f"Fallback prediction error: {e2}")
            
    if hasattr(model, 'get_shap_values'):
        # Specific to MockModel format for now
        mock_shap = model.get_shap_values(features)
        shap_values = [
            FeatureExplanation(feature=item["feature"], shap_value=item["shap_value"])
            for item in mock_shap
        ]
    else:
        # Fallback empty SHAP values
        shap_values = [FeatureExplanation(feature=k, shap_value=0.1) for k in list(features.keys())[:3]]
        
    # Map risk_score to risk_label
    risk_label = "LOW"
    if risk_score > 0.7:
        risk_label = "HIGH"
    elif risk_score > 0.4:
        risk_label = "MEDIUM"
        
    return {
        "risk_score": risk_score,
        "risk_label": risk_label,
        "top_features": shap_values
    }

def run_batch_prediction(model: Any, df: pd.DataFrame, inverter_ids: list[str]) -> list[Dict[str, Any]]:
    """
    Run prediction on a batch of data (DataFrame) returning a list of results.
    """
    results = []
    risk_scores = []
    
    if hasattr(model, 'predict_proba') or type(model).__name__ == 'MockModel':
        try:
            if hasattr(model, "feature_names_in_"):
                expected_cols = list(model.feature_names_in_)
            elif hasattr(model, "get_booster"):
                expected_cols = model.get_booster().feature_names
            else:
                expected_cols = []
            
            if expected_cols:
                for col in expected_cols:
                    if col not in df.columns:
                        df[col] = 0.0
                df = df[expected_cols]
                
                # Check if model explicitly saved feature types during training
                if hasattr(model, "feature_types_in_"):
                    # Map the exact training datatypes (e.g. 'bool', 'int64', 'float64') back to the dataframe
                    for col, dtype in zip(model.feature_names_in_, model.feature_types_in_):
                        if col in df.columns:
                            try:
                                df[col] = df[col].astype(dtype)
                            except Exception:
                                df[col] = df[col].astype(float)
                else:
                    df = df.astype(float)
        except Exception:
            pass

        try:
            print("\n" + "="*40)
            print("BACKEND DIAGNOSTICS (run_batch_prediction)")
            print("="*40)
            print(f"Data Shape: {df.shape}")
            missing_vals = df.isna().sum().sum()
            print(f"Total Missing/NaN Values: {missing_vals}")
            print(f"\nData Types:\n{df.dtypes.value_counts()}")
            if not df.empty:
                print(f"\nFirst Row Values:\n{df.iloc[0].to_dict()}")
            print("="*40 + "\n")

            # Force all columns exactly to float
            df = df.apply(pd.to_numeric, errors='coerce').fillna(0)

            if hasattr(model, 'predict_proba'):
                preds = model.predict_proba(df)
                risk_scores = [float(p[1]) for p in preds]
            else:
                preds = model.predict(df)
                risk_scores = [float(p) for p in preds]
        except Exception as e:
            print(f"Prediction error in batch: {e}")
            if hasattr(model, 'predict'):
                try:
                    preds = model.predict(df)
                    risk_scores = [float(p) for p in preds]
                except Exception as e2:
                    print(f"Fallback prediction error: {e2}")
                    pass
                
    # fallback if model prediction failed or was empty
    if not risk_scores:
        risk_scores = [0.0] * len(df)
        
    for i, score in enumerate(risk_scores):
        risk_label = "LOW"
        if score > 0.7:
            risk_label = "HIGH"
        elif score > 0.4:
            risk_label = "MEDIUM"
            
        inv_id = inverter_ids[i] if i < len(inverter_ids) else f"INV-UNKNOWN-{i}"
        
        # We skip real SHAP for batch to keep it fast for now, or mock it
        shap_values = [FeatureExplanation(feature="batch_mock_feature", shap_value=0.1)]
        
        results.append({
            "inverter_id": inv_id,
            "risk_score": score,
            "risk_label": risk_label,
            "top_features": shap_values
        })
        
    return results
