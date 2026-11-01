// NoSQL HW1 — Part 2: Analytical Queries
// Run in mongosh: load("queries/part2_queries.js")

db = db.getSiblingDB("spotify");

// ======================================================
// Query 1 — Party Tracks
// ======================================================

print("\n=== Query 1: Party Tracks ===");

const partyTracks = db.tracks.aggregate(
    {
        'audio_features.danceability': { $gt: 0.7 },
        'audio_features.energy': { $gt: 0.7 },
        duration_ms: { $gte: 180000, $lte: 300000 }
    },
    {
    _id: 0,
    track_name: 1,
    artists: 1,
    track_genre: 1,
    popularity: 1,
    duration_ms: 1,
    "audio_features.danceability": 1,
    "audio_features.energy": 1
}
).sort({ popularity: -1 }).limit(10).toArray();

printjson(partyTracks);

print(
"Total matching party tracks:",
db.tracks.countDocuments({
    "audio_features.danceability": { $gt: 0.7 },
    "audio_features.energy": { $gt: 0.7 },
    duration_ms: { $gte: 180000, $lte: 300000 }
    })
);

// ======================================================
// Query 2 — Artists Whose All Tracks Are Popular
// ======================================================

print("\n=== Query 2: Popular Artists ===");

printjson(
db.tracks.aggregate([
    {
    $unwind: "$artists"
    },
    {
    $group: {
        _id: "$artists",
        track_count: { $sum: 1 },
        min_popularity: { $min: "$popularity" },
        avg_popularity: { $avg: "$popularity" }
    }
    },
    {
    $match: {
        track_count: { $gte: 3 },
        min_popularity: { $gte: 60 }
    }
    },
    {
    $project: {
        _id: 0,
        artist: "$_id",
        track_count: 1,
        min_popularity: 1,
        avg_popularity: { $round: ["$avg_popularity", 1] }
    }
    },
    {
    $sort: {
        avg_popularity: -1,
        artist: 1
    }
    },
    {
    $limit: 20
    }
]).toArray()
);

// ======================================================
// Query 3 — Unusual Tempo Tracks
// ======================================================

print("\n=== Query 3: Unusual Tempo Tracks ===");

printjson(
db.tracks.aggregate([
    {
    $group: {
        _id: "$track_genre",
        avg_tempo: { $avg: "$audio_features.tempo" },
        std_tempo: { $stdDevPop: "$audio_features.tempo" }
    }
    },
    {
    $addFields: {
        outlier_threshold: {
        $add: [
            "$avg_tempo",
            { $multiply: [2, "$std_tempo"] }
        ]
        }
    }
    },
    {
    $lookup: {
        from: "tracks",
        let: {
        genre: "$_id",
        threshold: "$outlier_threshold"
        },
        pipeline: [
        {
            $match: {
            $expr: {
                $and: [
                { $eq: ["$track_genre", "$$genre"] },
                {
                    $gt: [
                    "$audio_features.tempo",
                    "$$threshold"
                    ]
                }
                ]
            }
            }
        },
        {
            $project: {
            track_name: 1,
            popularity: 1,
            artists: 1,
            "audio_features.tempo": 1
            }
        }
        ],
        as: "outlier_tracks"
    }
    },
    {
    $unwind: "$outlier_tracks"
    },
    {
    $group: {
        _id: "$_id",
        avg_tempo: { $first: "$avg_tempo" },
        outlier_threshold: { $first: "$outlier_threshold" },
        outlier_tracks: { $push: "$outlier_tracks" }
    }
    },
    {
    $project: {
        _id: 0,
        genre: "$_id",
        avg_tempo: { $round: ["$avg_tempo", 2] },
        outlier_threshold: {
        $round: ["$outlier_threshold", 2]
        },
        outlier_tracks: 1
    }
    },
    {
    $sort: { genre: 1 }
    }
], { allowDiskUse: true }).toArray()
);