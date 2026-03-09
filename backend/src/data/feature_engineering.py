import random
from typing import Dict, Any, List

def compute_rolling_stats(telemetry_dict: Dict[str, List[float]]) -> Dict[str, Any]:
    """
    Compute mock rolling statistics from telemetry data.
    """
    temperature_list = telemetry_dict.get("temperature", [])
    temp_max = max(temperature_list) if temperature_list else random.uniform(50.0, 80.0)
    
    pr_trend = random.uniform(-0.5, 0.5)
    
    return {
        "temp_7d_rolling_max": temp_max,
        "alarm_freq_3d": random.randint(0, 5),
        "pr_trend_7d": pr_trend
    }
