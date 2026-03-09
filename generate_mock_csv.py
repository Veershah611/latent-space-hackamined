import pandas as pd
import json

with open("frontend/src/features.json", "r") as f:
    feats = json.load(f)["features"]

df = pd.DataFrame(columns=["inverter_id"] + feats)

# Add some mock rows
df.loc[0] = ["INV-ALPHA-01"] + [1.0] * len(feats)
df.loc[1] = ["INV-BETA-02"] + [1.5] * len(feats)
df.loc[2] = ["INV-GAMMA-03"] + [0.3] * len(feats)
df.loc[3] = ["INV-DELTA-04"] + [0.8] * len(feats)

df.to_csv("backend/mock_inverters.csv", index=False)
print("Created backend/mock_inverters.csv with 4 rows.")
