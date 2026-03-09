import random
from typing import List, Dict

def generate_mock_telemetry(inverter_id: str, num_points: int = 100) -> Dict[str, List[float]]:
    """
    Generate mock synthetic inverter telemetry data.
    """
    return {
        "dc_voltage": [random.uniform(400.0, 600.0) for _ in range(num_points)],
        "ac_power": [random.uniform(5.0, 10.0) for _ in range(num_points)],
        "temperature": [random.uniform(20.0, 70.0) for _ in range(num_points)],
        "irradiance": [random.uniform(100.0, 1000.0) for _ in range(num_points)]
    }
