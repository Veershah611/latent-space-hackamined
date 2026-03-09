from src.genai.llm_client import is_llm_available, get_gemini_client
import logging
from typing import Any, List

FEATURE_LABELS = {
    "inv_kwh_total": "Total Energy (kWh)",
    "roll_temp_mean_7d": "Average Temperature over 7 days",
    "roll_kwh_today_std_7d": "Energy Variability over 7 days",
    "roll_temp_std_7d": "Temperature Volatility over 7 days",
    "roll_temp_std_3d": "Temperature Volatility over 3 days",
    "roll_temp_mean_3d": "Average Temperature over 3 days",
    "roll_pv1_power_std_7d": "PV1 Power Variability over 7 days",
    "anom_night_power_7d": "Night Power Anomaly over 7 days",
    "roll_kwh_today_mean_7d": "Daily Energy Mean over 7 days",
    "roll_kwh_today_std_3d": "Energy Variability over 3 days",
    "str_worst_ratio_rmean_7d": "String Imbalance Ratio over 7 days",
    "day_of_week": "Day of Week",
    "inv_power": "Inverter Power",
    "str_mean_rmean_7d": "String Mean Ratio over 7 days",
    "roll_kwh_today_mean_3d": "Daily Energy Mean over 3 days",
    "stress_hightemp_7d": "High Temperature Stress Days over 7 days",
    "is_daytime": "Is Daytime",
    "anom_night_hightemp_7d": "Night High Temperature Anomaly over 7 days",
    "roll_power_std_3d": "Power Volatility over 3 days",
    "roll_pv1_power_mean_3d": "PV1 Power Mean over 3 days",
}

def answer_query(question: str, inverter_id: str | None = None, risk_score: float | None = None, top_features: List[Any] | None = None, csv_context: str | None = None, parameters: str | None = None) -> str:
    """
    Answer an operator query using RAG powered by SHAP features context and fleet overview.
    """
    if is_llm_available():
        try:
            client = get_gemini_client()
            if client:
                feature_details = []
                if top_features:
                    for f in top_features:
                        raw_name = getattr(f, 'feature', str(f))
                        feat_name = FEATURE_LABELS.get(raw_name, raw_name)
                        shap_val = getattr(f, 'shap_value', 'Unknown')
                        feature_details.append(f"{feat_name} (SHAP importance value: {shap_val})")
                feature_str = ", ".join(feature_details) if feature_details else 'No specific anomalous features detected or provided.'
                
                context_str = "--- ACTIVE INVERTER CONTEXT ---\n"
                context_str += f"Inverter ID: {inverter_id if inverter_id else 'None selected'}\n"
                context_str += f"Current Risk Score: {risk_score if risk_score is not None else 'N/A'}\n"
                context_str += f"Key Anomalous Features Tracking (SHAP Analysis): {feature_str}\n\n"
                context_str += "--- FLEET OVERVIEW CONTEXT ---\n"
                context_str += f"{csv_context if csv_context else 'No fleet-wide data provided.'}\n"

                prompt = (
                    f"System Role:\n"
                    f"You are an analytical, data-driven assistant. Your primary function is to answer questions based on the user-provided data, and to provide expert solar maintenance advice when asked.\n\n"
                    f"Context (Derived from ML Model & SHAP analysis):\n"
                    f"{context_str}\n\n"
                    f"User Parameters:\n"
                    f"{parameters if parameters else 'No user parameters provided.'}\n\n"
                    f"Strict Instructions:\n"
                    f"- A positive SHAP impact drives the probability of failure UP. A negative buffer drives it DOWN.\n"
                    f"- When asked about 'what maintenance is required' or 'how to fix this', you MUST use your pre-trained engineering knowledge to recommend specific real-world actions to mitigate the exact anomalies listed in the context.\n"
                    f"- Never hallucinate data about the inverters themselves. If asked about a metric not in the context (like 'what is the exact voltage in string 3'), say: \"Based on the provided anomaly analysis data, I cannot fully answer this.\"\n"
                    f"- If the question is completely irrelevant to solar physics, maintenance, or the provided context, state that you cannot answer.\n"
                    f"- Respond naturally and conversationally, but concisely.\n\n"
                    f"Question:\n"
                    f"{question}"
                )
                response = client.generate_content(prompt)
                if response.text:
                    return response.text
        except Exception as e:
            logging.error(f"Error answering query with LLM: {e}")
            return f"The AI analysis was interrupted by a connection error (such as a Rate Limit/Quota Exceeded): {str(e)}"
        
    # Default fallback answer
    return "This is a default response because the AI assistant is currently unavailable. Please verify your LLM_API_KEY configuration to enable Q&A."