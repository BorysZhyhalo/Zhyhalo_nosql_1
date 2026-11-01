// NoSQL HW1 — Part 2: Analytical Queries
// Run in mongosh: load("queries/part2_queries.js")

db = db.getSiblingDB("spotify");

// ======================================================
// Query 1 — Party Tracks
// ======================================================

print("\n=== Query 1: Party Tracks ===");

const partyTracks = db.tracks.aggregate([
    {
        'audio_features.danceability': { $gt: 0.7 },
        'audio_features.energy': { $gt: 0.7 },
        duration_ms: { $lt: 300000 }
    },
    {