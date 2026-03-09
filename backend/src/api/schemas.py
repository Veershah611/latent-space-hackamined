from pydantic import BaseModel
from typing import List

class AlarmHistory(BaseModel):
    timestamp: str
    code: str

class TelemetryData(BaseModel):
    features: dict[str, float]

class PredictRequest(BaseModel):
    inverter_id: str
    telemetry: TelemetryData
    alarm_history: List[AlarmHistory] = []

class FeatureExplanation(BaseModel):
    feature: str
    shap_value: float

class PredictResponse(BaseModel):
    inverter_id: str
    risk_score: float
    risk_label: str
    prediction_window: str = "7-10 days"
    top_features: List[FeatureExplanation]

class BatchPredictResponse(BaseModel):
    results: List[PredictResponse]

class ExplainResponse(BaseModel):
    inverter_id: str
    narrative: str

class QueryRequest(BaseModel):
    question: str
    csv_context: str | None = None
    parameters: str | None = None
    inverter_id: str | None = None
    risk_score: float | None = None
    top_features: List[FeatureExplanation] | None = None

class ExplainRequest(BaseModel):
    inverter_id: str
    risk_score: float | None = None
    risk_label: str | None = None
    top_features: List[FeatureExplanation] | None = None
    csv_context: str | None = None
    parameters: str | None = None

class PredefinedQuestionsRequest(BaseModel):
    csv_context: str | None = None
    parameters: str | None = None