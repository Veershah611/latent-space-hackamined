from fastapi import APIRouter, File, UploadFile, HTTPException
import pandas as pd
from src.api.schemas import (
    PredictRequest, PredictResponse, FeatureExplanation,
    ExplainRequest, ExplainResponse, QueryRequest, BatchPredictResponse,
    PredefinedQuestionsRequest
)
from typing import Dict, Any, List

router = APIRouter()

# Demo inverters for Risk Overview (replace with DB/ML in production)
DEMO_INVERTERS = [
    {"inverter_id": "INV-042", "risk_score": 0.82, "risk_label": "HIGH", "prediction_window": "7-10 days"},
    {"inverter_id": "INV-018", "risk_score": 0.45, "risk_label": "MEDIUM", "prediction_window": "7-10 days"},
    {"inverter_id": "INV-033", "risk_score": 0.12, "risk_label": "LOW", "prediction_window": "7-10 days"},
    {"inverter_id": "INV-007", "risk_score": 0.91, "risk_label": "HIGH", "prediction_window": "7-10 days"},
]


@router.get("/health")
async def health_check() -> Dict[str, Any]:
    return {"status": "healthy", "model_loaded": True}


@router.get("/inverters")
async def get_inverters() -> List[Dict[str, Any]]:
    """Return inverter risk overview for dashboard (demo data)."""
    return DEMO_INVERTERS


from fastapi import Request

@router.post("/predict", response_model=PredictResponse)
async def predict(request: PredictRequest, fast_req: Request):
    model = fast_req.app.state.model
    # Get arbitrary features dict
    features_dict = request.telemetry.features
    
    # Run the real ML prediction
    from src.ml.predict import run_prediction
    result = run_prediction(model, features_dict)
    
    return PredictResponse(
        inverter_id=request.inverter_id,
        risk_score=result["risk_score"],
        risk_label=result["risk_label"],
        top_features=result["top_features"]
    )

import os
import pickle
import json
from pathlib import Path

MODEL_DIR = Path(os.getcwd()) / "models"
MODEL_PATH = MODEL_DIR / "xgboost_solar_model.pkl"
FEATURES_PATH = MODEL_DIR / "feature_columns.json"

GLOBAL_MODEL = None
GLOBAL_FEATURES = []

def load_globals():
    global GLOBAL_MODEL, GLOBAL_FEATURES
    if GLOBAL_MODEL is None and MODEL_PATH.exists():
        with open(MODEL_PATH, "rb") as f:
            GLOBAL_MODEL = pickle.load(f)
        # Fix SHAP compatibility - base_score string bug
        if hasattr(GLOBAL_MODEL, 'get_booster'):
            GLOBAL_MODEL.get_booster().set_param('base_score', 0.5)
    if not GLOBAL_FEATURES and FEATURES_PATH.exists():
        with open(FEATURES_PATH, "r") as f:
            GLOBAL_FEATURES = json.load(f)

@router.post("/predict_csv", response_model=BatchPredictResponse)
async def predict_csv(file: UploadFile = File(...)):
    import io
    load_globals()
    
    content = await file.read()
    df = pd.read_csv(io.BytesIO(content))
    
    # Save original IDs if any exist before alignment slices them off
    inverter_ids = []
    if "inverter_id" in df.columns:
        inverter_ids = df["inverter_id"].astype(str).tolist()
    elif "inverter_idx" in df.columns:
        inverter_ids = [f"INV-CSV-{idx}" for idx in df["inverter_idx"].tolist()]
    else:
        inverter_ids = [f"INV-CSV-{i+1}" for i in range(len(df))]
        
    # FORCE ALIGNMENT
    if GLOBAL_FEATURES:
        for col in GLOBAL_FEATURES:
            if col not in df.columns:
                df[col] = 0.0
        df = df[GLOBAL_FEATURES]
        
    # Get the Risk Score
    top_features_per_row = []
    if GLOBAL_MODEL is not None:
        # Convert to numeric to prevent XGBoost type errors
        df = df.apply(pd.to_numeric, errors='coerce').fillna(0)
        
        # Print the exact first row right before it hits the model
        if len(df) > 0:
            print("\n--- WHAT XGBOOST ACTUALLY SEES ---")
            print(df.iloc[0].to_dict())
            
        try:
            probabilities = GLOBAL_MODEL.predict_proba(df)[:, 1]
        except Exception:
            probabilities = GLOBAL_MODEL.predict(df)
            
        # Generate SHAP explanations
        try:
            import shap
            import numpy as np
            
            explainer = shap.TreeExplainer(GLOBAL_MODEL)
            shap_vals = explainer.shap_values(df)
            
            # If binary classifier, shap_values might return a list [class0, class1] or just class1.
            if isinstance(shap_vals, list):
                shap_vals = shap_vals[1]
                
            for i in range(len(df)):
                row_shap = shap_vals[i]
                # Get indices sorted by absolute shap value in descending order
                top_indices = np.argsort(np.abs(row_shap))[::-1][:10]
                
                row_top_features = []
                for idx in top_indices:
                    feat_name = GLOBAL_FEATURES[idx] if GLOBAL_FEATURES and idx < len(GLOBAL_FEATURES) else df.columns[idx]
                    feat_val = float(row_shap[idx])
                    if abs(feat_val) > 0.0001:
                        row_top_features.append(FeatureExplanation(feature=feat_name, shap_value=feat_val))
                
                # Fallback if no features had an impact
                if not row_top_features:
                    row_top_features = [FeatureExplanation(feature="base_model_bias", shap_value=0.1)]
                    
                top_features_per_row.append(row_top_features)
        except Exception as e:
            import traceback
            err_msg = f"SHAP Error: {str(e)} | Trace: {traceback.format_exc()}"
            print(err_msg, flush=True)
            top_features_per_row = [[FeatureExplanation(feature="shap_explanation_failed", shap_value=0.1)] for _ in range(len(df))]
    else:
        probabilities = [0.0] * len(df)
        top_features_per_row = [[FeatureExplanation(feature="no_model_loaded", shap_value=0.0)] for _ in range(len(df))]
        
    # Convert to percentages
    risk_scores = [round(float(p) * 100, 2) for p in probabilities]
    
    results = []
    for i, score in enumerate(risk_scores):
        # Score is now 0-100
        risk_label = "LOW"
        if score > 70:
            risk_label = "HIGH"
        elif score > 40:
            risk_label = "MEDIUM"
            
        results.append(PredictResponse(
            inverter_id=inverter_ids[i],
            risk_score=score,
            risk_label=risk_label,
            prediction_window="7-10 days",
            top_features=top_features_per_row[i]
        ))
        
    return BatchPredictResponse(results=results)

@router.post("/explain", response_model=ExplainResponse)
async def explain(request: ExplainRequest):
    from src.genai.narrative import generate_explanation
    
    # Handle nullable fields in the ExplainRequest
    risk_score = request.risk_score if request.risk_score is not None else 0.8
    top_features = request.top_features if request.top_features is not None else []
    
    narrative = generate_explanation(
        request.inverter_id,
        risk_score,
        top_features,
        request.csv_context,
        request.parameters
    )
    
    return ExplainResponse(
        inverter_id=request.inverter_id,
        narrative=narrative
    )

@router.post("/query")
async def query(request: QueryRequest):
    from src.genai.rag import answer_query
    answer = answer_query(
        request.question, 
        request.inverter_id, 
        request.risk_score, 
        request.top_features, 
        request.csv_context,
        request.parameters
    )
    return {"answer": answer}

# Removed training routes to decouple ML pipeline