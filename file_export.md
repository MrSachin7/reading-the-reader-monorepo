# Experiment File Export — Size Analysis & Optimization Findings

## 1. Overview

A 10-minute session produces a JSON file of roughly 100 MB. The export is a single
`completed-experiment.json` written to disk when the researcher clicks "Finish Experiment".
It is not compressed or split. The same structure is also maintained incrementally as
`participant-replay-recovery.json` throughout the session, which is re-serialized in full
on every periodic flush.

**Key file paths:**
- Export schema: `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Replay/ExperimentReplayExport.cs`
- Serializer: `Backend/src/infrastructure/ReadingTheReader.Realtime.Persistence/ExperimentReplayExportSerializer.cs`
- Persistence adapter: `Backend/src/infrastructure/ReadingTheReader.Realtime.Persistence/FileExperimentReplayRecoveryStoreAdapter.cs`
- Recording logic: `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Session/ExperimentSessionManager.Replay.cs`
- Finish endpoint: `Backend/src/ReadingTheReader.WebApi/ExperimentSessionEndpoints/FinishExperimentEndpoint.cs`

---

## 2. Top-Level Export Structure (`ExperimentReplayExport`)

The root object has eight sections:

| Section | Contents |
|---|---|
| `manifest` | Schema version, timestamps, producer metadata |
| `experiment` | Participant, device, calibration, all lifecycle events |
| `content` | **Full markdown text** of the reading material |
| `sensing` | **All raw gaze samples** collected during the session |
| `derived` | Viewport, focus, attention, context-preservation events |
| `interventions` | Decision proposals, scheduled interventions, applied events |
| `replay` | Baseline presentation and appearance settings |
| `annotations` | User annotations (empty array in current implementation) |

---

## 3. What Is Recorded and How Often

### 3.1 Raw Gaze Samples — Primary Size Driver

**Schema (`RawGazeSampleRecord`):**
```
sequenceNumber          long
capturedAtUnixMs        long
elapsedSinceStartMs     long?
deviceTimeStampUs       long
systemTimeStampUs       long?
left / right (each):
  gazePoint2D           { x, y, validity }
  gazePoint3D           { x?, y?, z? }
  pupil                 { diameterMm?, validity }
  gazeOrigin3D          { x?, y?, z?, validity }
  gazeOriginTrackBox    { x?, y?, z? }
```

- **Rate:** every eye-tracker callback — 60–120 Hz for Tobii hardware
- **Samples per 10-minute session:** 36 000 – 72 000
- **Per-record JSON size:** ~300 bytes (both eyes, all fields, camelCase keys)
- **Section total:** **11–22 MB**

Every field is serialized whether it has a value or not, because nullable structs still
emit `null` tokens in JSON. Both eyes are always present even when one eye is occluded.

### 3.2 Attention Events — Second Largest Contributor

**Schema (`ReadingAttentionEventRecord`):**
```
sequenceNumber          long
occurredAtUnixMs        long
elapsedSinceStartMs     long?
summary:
  updatedAtUnixMs       long
  tokenStats            Dictionary<tokenId, { fixationMs, fixationCount, skimCount,
                                              maxFixationMs, lastFixationMs }>
  currentTokenId        string?
  currentTokenDurationMs long
  fixatedTokenCount     int
  skimmedTokenCount     int
```

**The critical problem:** `tokenStats` is the full cumulative dictionary for every token
the participant has ever looked at. It is serialized entirely inside every attention event.

- **Tokens in a typical document:** 500 – 3 000
- **Per-record JSON size:** 5 – 30 KB (grows as more tokens are visited)
- **Events per session:** 10 – 100
- **Section total:** 0.5 – 3 MB, but can spike much higher on long documents

### 3.3 Reading Session State Records — Hidden Redundancy

`RecordReadingSessionState()` is called on every significant state mutation:
intervention queued, intervention applied, intervention merged, focus updated, etc.
Each call serializes a **full `LiveReadingSessionSnapshot`**, which includes the entire
presentation, appearance, calibration status, policy, decision configuration, and
more — roughly 2–5 KB per record.

These records are written to the recovery file during the session but are NOT included
in the final `completed-experiment.json`. They do however dominate the write amplification
during recording (see §5).

### 3.4 Other Event Records (Minor Contributors)

| Event type | Fields | Rate | Total |
|---|---|---|---|
| `ParticipantViewportEventRecord` | 8 numeric fields | 10–100/session | < 50 KB |
| `ReadingFocusEventRecord` | token/sentence/block IDs + coords | 10–100/session | < 50 KB |
| `InterventionEventRecord` | 13 fields + full presentation + appearance snapshots | 0–50/session | < 500 KB |
| `DecisionProposalEventRecord` | signal + proposed command | 0–100/session | < 500 KB |
| `ScheduledInterventionEventRecord` | pending intervention state | 0–50/session | < 200 KB |
| `ExperimentLifecycleEventRecord` | status strings + timestamps | 2–10/session | < 10 KB |

### 3.5 Content Section

The full markdown string of the reading material is embedded directly in the export
under `content.markdown`. For a typical academic-length text this is 50 KB – 3 MB.
It is stored verbatim so the replay viewer can reconstruct the exact document without
needing a separate lookup.

---

## 4. Size Breakdown Estimate (10-minute session)

| Section | Estimated size |
|---|---|
| Raw gaze samples (60 Hz × 600 s × ~300 B) | **11 MB** |
| Raw gaze samples (120 Hz variant) | **22 MB** |
| Attention events (50 events × avg 20 KB) | **1 MB** |
| Reading content (markdown) | **0.5 – 3 MB** |
| Intervention / proposal events | **< 1 MB** |
| Viewport / focus events | **< 0.2 MB** |
| Manifest, experiment metadata, replay baseline | **< 0.5 MB** |
| JSON key overhead (camelCase, uncompressed) | **~15–20% of total** |
| **Total (60 Hz)** | **~15–20 MB unoptimized** |
| **Total (120 Hz)** | **~30–35 MB unoptimized** |

The reported 100 MB suggests either: (a) the tracker runs at 120 Hz and attention events
are large, (b) the recovery file is what the user is opening (which is re-written in full
on every flush and accumulates overhead), or (c) the session state records end up in the
recovery file and inflate it significantly before the final export is built.

---

## 5. Write Amplification During Recording

The recovery file (`participant-replay-recovery.json`) is not append-only. On every
periodic flush, the adapter:

1. Reads the entire existing file from disk
2. Merges pending events in memory
3. Serializes the entire merged export back to disk

For a 120 Hz session, flushes happen every few seconds. By minute 9 of a 10-minute
session the file is already ~90 MB, and each flush reads and re-writes all 90 MB.
This is O(n²) total disk I/O for the recording phase — purely an implementation detail
that does not affect the final file size but makes recording expensive.

---

## 6. Concrete Redundancies

### 6.1 Full token stats on every attention event

The entire `tokenStats` dictionary is copied into every attention record. By the end of
a session the last few attention events contain the same token data as the previous ones,
differing only in a handful of counters. The cumulative data could instead be stored
once as a final snapshot, with each event carrying only the delta.

### 6.2 Nullable fields always serialized as `null`

Both eye samples always have the full struct even when a field is unmeasured. A 10-field
eye sample where 4 fields are `null` still emits 4 `"field": null` pairs. With 50 000
records this adds up to millions of `null` tokens.

### 6.3 String keys repeated 36 000–72 000 times

Every gaze record repeats the same ~20 JSON key strings:
`"sequenceNumber"`, `"capturedAtUnixMs"`, `"left"`, `"gazePoint2D"`, `"x"`, `"y"`,
`"validity"`, etc. Those key strings alone account for ~100–150 bytes per record,
totalling 4–11 MB of pure key overhead across a session.

### 6.4 Redundant timestamps

Each gaze record carries four timestamps:
- `capturedAtUnixMs` — backend receipt time in ms
- `elapsedSinceStartMs` — derived from the above
- `deviceTimeStampUs` — hardware clock in microseconds
- `systemTimeStampUs` — OS clock in microseconds

`elapsedSinceStartMs` is always `capturedAtUnixMs - sessionStartMs`, so it is fully
derivable. `systemTimeStampUs` at 10⁶× precision per sample adds 8 bytes of integer
but only ~1 ms of precision beyond `capturedAtUnixMs`.

### 6.5 Duplicate presentation/appearance in intervention events

Each `InterventionEventRecord` embeds a full `ReadingPresentationSnapshot` and
`ReaderAppearanceSnapshot` (the state after the intervention). For a session with
30 interventions, this means 30 complete copies of a snapshot that differs from the
previous by a single field.

---

## 7. What Is Actually Needed for Analysis vs. Replay

Understanding the two consumers helps prioritize what to keep:

**Replay viewer** needs:
- Gaze samples (to animate the gaze overlay)
- Viewport / focus / attention events (to show derived state)
- Intervention events (to show when typography changed and what it changed to)
- Content markdown (to render the document)
- Presentation baseline (to know starting typography)

**Analysis / research** needs:
- Gaze samples (raw signal, possibly downsampled)
- Attention token stats (final state — not every intermediate snapshot)
- Intervention events (when, what, outcome)
- Participant metadata

Neither consumer needs `elapsedSinceStartMs` (derivable), `systemTimeStampUs`
(redundant with `deviceTimeStampUs` for analysis), or the full token dictionary inside
every intermediate attention event.

---

## 8. Optimization Opportunities (Ranked by Impact)

### O1 — Delta-encode attention token stats (High impact, ~60–80% reduction in attention section)
Store only the tokens whose stats changed since the previous event, not the entire
dictionary. The final event (or a separate section) carries the complete cumulative map.

### O2 — Strip nullable eye-sample fields (Medium impact, ~15–20% reduction in gaze section)
Omit fields that are `null` rather than emitting `"field": null`. A partial occlusion
record could shrink from ~300 bytes to ~180 bytes. Or use a presence bitmask.

### O3 — Remove derived/redundant timestamps (Low-medium impact, ~5–8% reduction in gaze section)
Drop `elapsedSinceStartMs` from every record — it is always `capturedAtUnixMs -
experiment.startedAtUnixMs`. This saves 8–9 bytes × 72 000 records ≈ 600 KB.

### O4 — Store final token stats once, not inside each event (High impact)
Move `tokenStats` out of `ReadingAttentionEventRecord` entirely. Store it as a single
`derived.finalAttentionSummary` object. Each attention event then only carries scalar
counters (`fixatedTokenCount`, `skimmedTokenCount`, `currentTokenId`, etc.).

### O5 — Gzip the final file (High impact, ~70–80% reduction in file size, zero data loss)
A plain `GZipStream` wrapper over the JSON serializer output would take the 100 MB
file to roughly 10–20 MB with no changes to the data model. Most analysis tools and
the replay viewer can transparently decompress. This is the lowest-effort highest-gain
change.

### O6 — Store content markdown separately (Low impact, 0.5–3 MB saved)
Write `content.markdown` to a sibling file `content.md` and replace it in the export
with `content.sourceHash` (already present). The replay viewer fetches the markdown by
hash. Eliminates duplication if multiple exports share the same document.

### O7 — Intervention snapshot diffs (Low impact, < 1 MB saved)
Replace the full presentation snapshot in each `InterventionEventRecord` with only the
properties that changed. The receiver reconstructs the full state by applying deltas
forward from the baseline.

### O8 — Switch gaze section to a columnar / binary format (Very high impact, ~60–70% reduction)
Instead of an array of JSON objects, store each gaze field as a typed array:
`"capturedAtUnixMs": [t0, t1, t2, ...]`, `"leftGazeX": [x0, x1, x2, ...]`, etc.
Columnar layout compresses extremely well (repetitive floats in sorted columns) and
eliminates all key repetition. This is a larger schema change but can co-exist with
the current format under a different `manifest.schema` version.

---

## 9. Recommended Minimal Change Set

If only one change is made: **O5 (Gzip)** cuts the file to a quarter of its current
size with a single `GZipStream` in the serializer, no schema changes.

If a schema change is acceptable: **O1 + O4 together** (delta attention stats +
remove tokenStats from events) plus **O3** (drop derived timestamps) would reduce the
file by 30–50% before compression, achieving sub-10 MB files after Gzip.
