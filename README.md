## Part 1 — Data Modeling: Theoretical Questions

### 1. Why are audio features stored in a nested `audio_features` object instead of a flat document? When is embedding beneficial, and when can it cause problems?

Audio characteristics such as `danceability`, `energy`, `tempo`, `loudness`, and `valence` are grouped into a nested `audio_features` object because they describe the same logical component of a track.

This structure makes the document easier to understand and maintain. It also allows applications to retrieve all audio characteristics together or access specific features using dot notation, for example, `audio_features.energy`.

**Embedding is beneficial** when related attributes are frequently accessed together, belong to the same track, and can be updated as part of one document. In our Spotify dataset, audio features naturally belong to an individual track, making embedding a suitable design choice.

However, embedding can become problematic when nested data grows significantly, is shared across many documents, or needs independent updates. Large documents may increase storage and update costs, while deeply nested structures can make queries and indexes more complex.

In this project, the `audio_features` object has a small, predictable structure, so the advantages of embedding outweigh its limitations.

### 2. Why are artists stored as an array instead of a string? Which queries become easier?

In the original Spotify dataset, artists are stored as a semicolon-separated string, such as `"Artist A;Artist B"`. During the MongoDB transformation, this string is converted into an array:

```javascript
artists: ["Artist A", "Artist B"]
```

An array represents the relationship more accurately because a track can have multiple artists.

It also simplifies querying. For example, MongoDB can find tracks featuring a specific artist without manually splitting strings:

```javascript
db.tracks.find({ artists: "Artist A" })
```

Additionally, the `$unwind` aggregation stage can expand the array into separate records for each artist. This makes it easier to calculate the number of tracks per artist, average popularity, and identify artists whose tracks consistently achieve high popularity.

**Arrays are particularly useful** for filtering, aggregation, and multikey indexing. They also make the schema more flexible when tracks feature collaborations.

The main limitation is that artist names are stored as text rather than unique artist identifiers. In a larger production system, a separate artist collection with stable IDs could improve consistency and support richer artist metadata.

### Part 3.1 — Compound Index Performance

Before indexing, the query used `COLLSCAN` followed by `SORT`, examining all 113,999 documents and taking 72 ms to return 354 matching tracks.

After creating a compound index on `track_genre`, `popularity`, and `audio_features.danceability`, the execution plan changed to `IXSCAN` followed by `FETCH`. The query examined 412 index keys and only 354 documents, reducing execution time to 2 ms.

The index also eliminated the separate sorting stage by supporting the requested popularity order. Both executions returned the same 354 documents.

This represents approximately a 36× speedup in the measured run. However, the query is not covered because the execution plan still includes `FETCH`.

The results demonstrate how a compound index can substantially reduce document scanning and sorting overhead for selective analytical queries.