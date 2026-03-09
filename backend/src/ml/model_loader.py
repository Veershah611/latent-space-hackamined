import os
import random
import logging
from typing import Any

class MockModel:
    def predict(self, features: dict) -> float:
        return random.uniform(0.0, 1.0)
    
    def get_shap_values(self, features: dict) -> list:
        return [
            {"feature": "temp_7d_rolling_max", "shap_value": 0.34},
            {"feature": "alarm_freq_3d", "shap_value": 0.21},
            {"feature": "pr_trend_7d", "shap_value": -0.18}
        ]

def get_model() -> Any:
    model_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "models", "xgboost_solar_model.pkl")
    try:
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found at {model_path}")
        
        import pickle
        with open(model_path, 'rb') as f:
            model = pickle.load(f)
        
        # Fix SHAP compatibility - base_score string bug
        if hasattr(model, 'get_booster'):
            model.get_booster().set_param('base_score', 0.5)
        
        return model
    except FileNotFoundError as e:
        logging.warning(f"{e}. Falling back to MockModel.")
        return MockModel()
    except Exception as e:
        logging.error(f"Error loading model: {e}. Falling back to MockModel.")
        return MockModel()

def load_model(path: str = None) -> Any:
    if path and os.path.exists(path):
        import pickle
        with open(path, 'rb') as f:
            model = pickle.load(f)
        
        # Fix SHAP compatibility - base_score string bug
        if hasattr(model, 'get_booster'):
            model.get_booster().set_param('base_score', 0.5)
        
        return model
    return get_model()