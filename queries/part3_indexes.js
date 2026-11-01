db = db.getSiblingDB("spotify");

print("\n=== Task 3.1: Baseline ===");

const filter = {
    track_genre: "pop",
    "audio_features.danceability": { $gte: 0.7 }
};

const sort = { popularity: -1 };

db.tracks.dropIndex("idx_genre_popularity_danceability"); // only if it already exists