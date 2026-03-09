import pickle
import pandas as pd
import json
import sys

sys.path.append('c:/Nisarg Docs/HACKaMINeD/latent-space-hackamined/backend')
from src.ml.predict import run_batch_prediction

try:
    with open('c:/Nisarg Docs/HACKaMINeD/latent-space-hackamined/backend/models/xgboost_solar_model.pkl', 'rb') as f:
        model = pickle.load(f)

    cols = [
        'inv_kwh_total', 'roll_temp_mean_7d', 'roll_kwh_today_std_7d', 
        'roll_temp_std_7d', 'roll_temp_std_3d', 'roll_temp_mean_3d', 
        'roll_pv1_power_std_7d', 'anom_night_power_7d', 'roll_kwh_today_mean_7d', 
        'roll_kwh_today_std_3d', 'str_worst_ratio_rmean_7d', 'day_of_week', 
        'inv_power', 'str_mean_rmean_7d', 'roll_kwh_today_mean_3d', 
        'stress_hightemp_7d', 'is_daytime', 'anom_night_hightemp_7d', 
        'roll_power_std_3d', 'roll_pv1_power_mean_3d'
    ]
    df = pd.DataFrame([ [1.0] * 20 ], columns=cols)
    out = []
    out.append("Testing batch prediction...")
    try:
        result = run_batch_prediction(model, df, ['INV-1'])
        out.append(f"Result: {result}")
    except Exception as e:
        import traceback
        out.append(traceback.format_exc())
    
    with open('c:/Nisarg Docs/HACKaMINeD/latent-space-hackamined/backend/test_out.txt', 'w') as f:
        f.write('\n'.join(out))
except Exception as e:
    import traceback
    with open('c:/Nisarg Docs/HACKaMINeD/latent-space-hackamined/backend/test_out.txt', 'w') as f:
        f.write(traceback.format_exc())
