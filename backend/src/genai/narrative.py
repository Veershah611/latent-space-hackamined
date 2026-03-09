from src.genai.llm_client import is_llm_available, get_gemini_client
from typing import List, Any
import logging
import json

def _generate_fallback_json(inverter_id, risk_level, risk_score, features, summary_text):
    top_causes = []
    for i, f in enumerate(features[:3]):
        feat_name = getattr(f, 'feature', str(f))
        shap_val = getattr(f, 'shap_value', 0.0)
        top_causes.append({
            "rank": i + 1,
            "name": feat_name,
            "importance": int(min(abs(shap_val) * 100, 100)),
            "category": "electrical",
            "description": f"Anomaly detected in {feat_name} feature.",
            "dataEvidence": f"SHAP impact factor: {shap_val}",
            "action": "Verify field telemetry parameters."
        })
        
    health_score = int((1.0 - risk_score) * 100) if risk_score <= 1.0 else int(100 - risk_score)
    health_score = max(0, min(100, health_score))

    obj = {
        "riskLevel": risk_level,
        "summary": summary_text,
        "topCauses": top_causes,
        "criticalEvents": [],
        "healthScore": health_score
    }
    return json.dumps(obj)

def generate_explanation(inverter_id: str, risk_score: float, features: List[Any], csv_context: str | None = None, parameters: str | None = None) -> str:
    """
    Generate an explanation narrative for the model prediction using SHAP values context.
    """
    feature_details = []
    for f in features:
        feat_name = getattr(f, 'feature', str(f))
        shap_val = getattr(f, 'shap_value', 'Unknown')
        feature_details.append(f"{feat_name} (SHAP impact: {shap_val})")
        
    feature_str = ", ".join(feature_details) if feature_details else "overall performance indicators"
    risk_level = "HIGH" if risk_score > 0.7 else ("MEDIUM" if risk_score > 0.4 else "LOW")

    if is_llm_available():
        try:
            client = get_gemini_client()
            if client:
                prompt = (
                    f"System Role:\n"
                    f"You are an analytical, data-driven assistant. Your primary function is to summarize model predictions strictly based on the provided explicit data.\n\n"
                    f"Context:\n"
                    f"Inverter {inverter_id} flagged with {risk_level} risk. (Model Score: {risk_score:.2f}).\n"
                    f"The primary anomalies pushing the risk score up are SHAP factors: {feature_str}\n\n"
                    f"User Parameters:\n"
                    f"{parameters if parameters else 'No user parameters provided.'}\n\n"
                    f"Task:\n"
                    f"Return ONLY valid, minified JSON matching this exact structure (no markdown blocks, no code fences). Do not append text before or after the JSON.\n\n"
                    "{\n"
                    "  \"riskLevel\": \"CRITICAL|HIGH|MEDIUM|LOW\",\n"
                    "  \"summary\": \"2-3 sentence executive summary explaining the situation based on the SHAP data\",\n"
                    "  \"topCauses\": [\n"
                    "    {\n"
                    "      \"rank\": 1,\n"
                    "      \"name\": \"Name of the causal feature (e.g. High Thermal Stress)\",\n"
                    "      \"importance\": 85, // Integer 0-100 indicating contribution\n"
                    "      \"category\": \"thermal|electrical|mechanical|software\",\n"
                    "      \"description\": \"Detailed explanation of why this feature is out of bounds and causing issues\",\n"
                    "      \"dataEvidence\": \"Quote feature SHAP values from the Context\",\n"
                    "      \"action\": \"Actionable recommendation for the plant engineer\"\n"
                    "    }\n"
                    "  ],\n"
                    "  \"criticalEvents\": [\n"
                    "    { \"description\": \"Significant single event\", \"severity\": \"CRITICAL|HIGH\" }\n"
                    "  ],\n"
                    "  \"healthScore\": 42 // Integer 0-100 representing overall health (inverse of risk)\n"
                    "}"
                )
                response = client.generate_content(prompt)
                if response.text:
                    return response.text
        except Exception as e:
            logging.error(f"Error generating explanation with LLM: {e}")
            return _generate_fallback_json(inverter_id, risk_level, risk_score, features, f"Failed to generate dynamic narrative. AI connection error: {str(e)}")
        
    # Hardcoded fallback
    return _generate_fallback_json(inverter_id, risk_level, risk_score, features, f"Inverter {inverter_id} shows a {risk_level} risk of failure (score: {risk_score:.2f}) within the next 7-10 days. The primary drivers are: {feature_str}.")