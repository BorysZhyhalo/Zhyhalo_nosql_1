# Spotify Analytics — MongoDB

A NoSQL analytics project built with **MongoDB Atlas**, **Python**, and **MongoDB Aggregation Framework**. The project demonstrates CSV ingestion, document-oriented data modeling, analytical queries, and index optimization using a Spotify tracks dataset.

## 1. Dataset & Project Structure

**Dataset:** [Spotify Tracks Dataset — Kaggle](https://www.kaggle.com/datasets/maharshipandya/-spotify-tracks-dataset)

- Original records: **114,000**
- Valid imported records: **113,999**
- Database: `spotify`
- Collections: `tracks_raw` (original data) and `tracks` (transformed data)

```text
Zhyhalo_nosql_1/
├── scripts/
│   ├── 01_load_data.py
│   └── 02_transform.js
├── queries/
│   ├── part2_queries.js
│   └── part3_indexes.js
├── requirements.txt
├── .gitignore
└── README.md
```

The CSV file and database credentials are excluded from version control.

## 2. Setup & Execution

**Requirements:** Python, MongoDB Shell (`mongosh`), and a MongoDB Atlas cluster.

1. Clone the repository and install Python dependencies:

   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```

2. Download the Spotify dataset from Kaggle and place it in the project root as `dataset.csv`.

3. Create a `.env` file containing the MongoDB Atlas connection string:

   ```dotenv
   MONGO_URI=mongodb+srv://<username>:<password>@<cluster-host>/
   ```

4. Import the dataset:

   ```powershell
   python scripts/01_load_data.py
   ```

5. Connect to MongoDB Atlas using `mongosh`, then execute:

   ```javascript
   load("scripts/02_transform.js")
   load("queries/part2_queries.js")
   load("queries/part3_indexes.js")
   ```

The transformation creates the `spotify.tracks` collection.

## 3. Data Modeling

The raw dataset is transformed into a document-oriented schema with nested audio features, artist arrays, and calculated attributes.

**Example document (simplified):**

```javascript
{
  track_name: "Comedy",
  artists: ["Gen Hoshino"],
  popularity: 73,
  duration_ms: 230666,
  duration_sec: 230.7,
  popularity_tier: "high",
  track_genre: "acoustic",
  audio_features: {
    danceability: 0.676,
    energy: 0.461,
    tempo: 87.917
  }
}
```

Popularity tiers are calculated as `high` (≥70), `medium` (40–69), and `low` (below 40).

### Why embed `audio_features`?

Audio characteristics belong to the same track and are frequently used together. Embedding provides a logical structure, supports dot-notation queries, and allows related fields to be read and updated within one document.

Embedding is less suitable for large, frequently changing, or shared data because it may increase duplication, document size, and maintenance overhead.

### Why store `artists` as an array?

A track may feature multiple performers. Arrays allow direct filtering by artist and simplify per-artist aggregations using `$unwind`.

```javascript
db.tracks.find({ artists: "Gen Hoshino" })
```

A limitation is that artist names are not stable identifiers. Larger systems may benefit from a separate artist collection.

## 4. Analytical Queries — Part 2

Four queries are implemented in `queries/part2_queries.js`.

| Query | Purpose | Main techniques |
|---|---|---|
| Party Tracks | Find danceable, energetic tracks lasting 3–5 minutes | Nested-field filtering, range conditions |
| Popular Artists | Find the top 20 artists with at least 3 tracks and minimum track popularity of 60 | `$unwind`, `$group`, `$min`, `$avg` |
| Unusual Tempo | Identify tracks exceeding their genre's mean tempo by more than two population standard deviations | `$stdDevPop`, `$lookup`, `$group` |
| Background Work | Find non-explicit tracks with low loudness and speechiness and high instrumentalness | Compound filtering |

**Observations:** The artist query evaluates minimum popularity across an artist's records, rather than filtering out unpopular tracks before grouping. The tempo query uses genre-specific statistical thresholds, so an outlier is identified relative to its genre.

The dataset may contain the same track in multiple genres; analytical counts are based on collection records unless explicitly deduplicated.

## 5. Index Optimization — Part 3 (Bonus)

Index performance was evaluated using `explain("executionStats")`.

### 5.1 Genre & Popularity Index

Compound index: `track_genre`, `popularity`, `audio_features.danceability`.

| Metric | Without index | With index |
|---|---:|---:|
| Execution plan | `COLLSCAN + SORT` | `IXSCAN + FETCH` |
| Execution time | 72 ms | 2 ms |
| Documents examined | 113,999 | 354 |
| Keys examined | 0 | 412 |
| Documents returned | 354 | 354 |

**Result:** Approximately **36× faster** in the measured run, with no separate sorting stage.

### 5.2 Background Music Index

Compound index: `explicit`, `audio_features.instrumentalness`, `audio_features.speechiness`.

| Metric | Without index | With index |
|---|---:|---:|
| Execution plan | `COLLSCAN` | `IXSCAN + FETCH` |
| Execution time | 123 ms | 38 ms |
| Documents examined | 113,999 | 16,141 |
| Keys examined | 0 | 16,602 |
| Documents returned | 16,141 | 16,141 |

**Result:** Approximately **3.24× faster**, with 86% fewer documents examined.

This benchmark uses three conditions, excluding the `loudness` condition from the full background-work query.

### 5.3 Covered Query

A covered query was tested using the background music index, filtering and projecting only indexed fields.

| Metric | Result |
|---|---|
| Execution plan | `PROJECTION_DEFAULT → IXSCAN` |
| Execution time | 39 ms |
| Documents returned | 18,382 |
| Documents examined | **0** |
| Keys examined | 18,382 |

The query was covered because MongoDB retrieved the requested fields directly from the index without fetching full documents.

*Execution times reflect individual measurements and may vary with caching and database load.*

## 6. Conclusion

The project demonstrates how MongoDB supports document-oriented data modeling and analytical processing through nested objects, arrays, aggregation pipelines, and compound indexes.

The transformation preserved **113,999 valid tracks**, and the indexing experiments demonstrated substantial reductions in document scans and execution time. These results highlight the importance of designing MongoDB schemas and indexes around practical query patterns.