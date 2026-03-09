import pickle
model = pickle.load(open('c:/Nisarg Docs/HACKaMINeD/latent-space-hackamined/backend/models/xgboost_solar_model.pkl', 'rb'))
import pandas as pd
with open('c:/Nisarg Docs/HACKaMINeD/latent-space-hackamined/backend/test_types.txt', 'w') as f:
    f.write('feature_names_in_: ' + str(getattr(model, 'feature_names_in_', 'N/A')) + '\n')
    f.write('feature_types_in_: ' + str(getattr(model, 'feature_types_in_', 'N/A')) + '\n')
    try:
        f.write('booster feature types: ' + str(model.get_booster().feature_types) + '\n')
    except Exception as e:
        f.write('booster error: ' + str(e) + '\n')
