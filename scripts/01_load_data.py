import os
from pathlib import Path

import pandas as pd
from pymongo import MongoClient
from tqdm import tqdm
from dotenv import load_dotenv

# Project configuration
PROJECT_ROOT = Path(__file__).resolve().parent.parent
CSV_PATH = PROJECT_ROOT / "dataset.csv"

load_dotenv(PROJECT_ROOT / ".env")

MONGO_URI = os.environ["MONGO_URI"]
DB_NAME = "spotify"
BATCH_SIZE = 1000

# Read dataset
df = pd.read_csv(CSV_PATH)

print(f"Original dataset: {len(df)} tracks")

# Remove records without artist or track name
df = df.dropna(subset=["artists", "track_name"]).copy()

print(f"Valid tracks: {len(df)}")

# Convert data types
df["explicit"] = df["explicit"].astype(bool)

int_cols = [
    "popularity",
    "duration_ms",
    "key",
    "mode",
    "time_signature",
]

for col in int_cols:
    df[col] = pd.to_numeric(df[col], errors="raise").astype(int)

float_cols = [
    "danceability",
    "energy",
    "loudness",
    "speechiness",
    "acousticness",
    "instrumentalness",
    "liveness",
    "valence",
    "tempo",
]

for col in float_cols:
    df[col] = pd.to_numeric(df[col], errors="raise").astype(float)

# Convert pandas missing values to MongoDB-compatible nulls
df = df.astype(object).where(pd.notna(df), None)

records = df.to_dict("records")

# Connect to MongoDB Atlas
client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=10000)

try:
    client.admin.command("ping")
    db = client[DB_NAME]

    # Recreate the raw collection for reproducible loading
    db["tracks_raw"].drop()

    for i in tqdm(range(0, len(records), BATCH_SIZE)):
        batch = records[i : i + BATCH_SIZE]
        db["tracks_raw"].insert_many(batch)

    count = db["tracks_raw"].count_documents({})

    print(f"Loaded documents: {count}")
    print("Example document:")
    print(db["tracks_raw"].find_one())

finally:
    client.close()
