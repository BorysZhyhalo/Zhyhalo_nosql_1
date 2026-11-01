db = db.getSiblingDB("spotify");

// ======================================================
// Part 3.1 — Compound Index Performance
// ======================================================

print("\n=== Part 3.1: Compound Index Performance ===");

const genreFilter = {
    track_genre: "pop",
    "audio_features.danceability": { $gte: 0.7 }
};

const genreSort = { popularity: -1 };

// Baseline: force collection scan without deleting indexes
const genreBaseline = db.tracks
    .find(genreFilter)
    .sort(genreSort)
    .hint({ $natural: 1 })
    .explain("executionStats");

print("\nWithout index (COLLSCAN):");
printjson({
    nReturned: genreBaseline.executionStats.nReturned,
    executionTimeMillis: genreBaseline.executionStats.executionTimeMillis,
    totalDocsExamined: genreBaseline.executionStats.totalDocsExamined,
    totalKeysExamined: genreBaseline.executionStats.totalKeysExamined,
    winningPlan: genreBaseline.queryPlanner.winningPlan
});

// Create compound index if not already present
db.tracks.createIndex(
    {
        track_genre: 1,
        popularity: -1,
        "audio_features.danceability": 1
    },
    {
        name: "idx_genre_popularity_danceability"
    }
);

// Indexed query
const genreIndexed = db.tracks
    .find(genreFilter)
    .sort(genreSort)
    .hint("idx_genre_popularity_danceability")
    .explain("executionStats");

print("\nWith compound index (IXSCAN):");
printjson({
    nReturned: genreIndexed.executionStats.nReturned,
    executionTimeMillis: genreIndexed.executionStats.executionTimeMillis,
    totalDocsExamined: genreIndexed.executionStats.totalDocsExamined,
    totalKeysExamined: genreIndexed.executionStats.totalKeysExamined,
    winningPlan: genreIndexed.queryPlanner.winningPlan
});

// ======================================================
// Part 3.2 — Background Music Index
// ======================================================

print("\n=== Part 3.2: Background Music Index ===");

const backgroundFilter = {
    explicit: false,
    "audio_features.instrumentalness": { $gt: 0.5 },
    "audio_features.speechiness": { $lt: 0.1 }
};

// Baseline
const backgroundBaseline = db.tracks
    .find(backgroundFilter)
    .hint({ $natural: 1 })
    .explain("executionStats");

print("\nWithout index (COLLSCAN):");
printjson({
    nReturned: backgroundBaseline.executionStats.nReturned,
    executionTimeMillis: backgroundBaseline.executionStats.executionTimeMillis,
    totalDocsExamined: backgroundBaseline.executionStats.totalDocsExamined,
    totalKeysExamined: backgroundBaseline.executionStats.totalKeysExamined,
    winningPlan: backgroundBaseline.queryPlanner.winningPlan
});

// Create index
db.tracks.createIndex(
    {
        explicit: 1,
        "audio_features.instrumentalness": -1,
        "audio_features.speechiness": 1
    },
    {
        name: "idx_background_music"
    }
);

// Indexed query
const backgroundIndexed = db.tracks
    .find(backgroundFilter)
    .hint("idx_background_music")
    .explain("executionStats");

print("\nWith index (IXSCAN):");
printjson({
    nReturned: backgroundIndexed.executionStats.nReturned,
    executionTimeMillis: backgroundIndexed.executionStats.executionTimeMillis,
    totalDocsExamined: backgroundIndexed.executionStats.totalDocsExamined,
    totalKeysExamined: backgroundIndexed.executionStats.totalKeysExamined,
    winningPlan: backgroundIndexed.queryPlanner.winningPlan
});

// ======================================================
// Part 3.3 — Covered Query
// ======================================================

print("\n=== Part 3.3: Covered Query ===");

const covered = db.tracks.find(
    {
        explicit: false,
        "audio_features.instrumentalness": { $gt: 0.5 }
    },
    {
        _id: 0,
        explicit: 1,
        "audio_features.instrumentalness": 1
    }
)
.hint("idx_background_music")
.explain("executionStats");

printjson({
    nReturned: covered.executionStats.nReturned,
    executionTimeMillis: covered.executionStats.executionTimeMillis,
    totalDocsExamined: covered.executionStats.totalDocsExamined,
    totalKeysExamined: covered.executionStats.totalKeysExamined,
    winningPlan: covered.queryPlanner.winningPlan
});

print("\n=== Part 3 completed successfully ===");
