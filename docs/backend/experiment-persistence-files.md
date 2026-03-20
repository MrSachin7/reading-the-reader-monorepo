# Experiment Persistence Files

This document explains which backend files are written during an experiment, what each file contains, and when each file is updated.

## Overview

The backend now uses two persistence layers during an experiment:

- a checkpoint snapshot of the latest session state
- an append-only session journal for detailed experiment history

After the session ends, the backend also writes the latest replay export and can save named JSON or CSV exports.

## Main Paths

With the current `appsettings.json`, the important paths are:

- snapshot checkpoint: `Backend/src/infrastructure/ReadingTheReader.Realtime.Persistence/data/experiment-session-snapshot.json`
- latest replay export: `Backend/src/infrastructure/ReadingTheReader.Realtime.Persistence/data/experiment-session-export.json`
- saved replay exports: `Backend/src/infrastructure/ReadingTheReader.Realtime.Persistence/data/experiment-replay-exports/`
- session journals: `Backend/src/infrastructure/ReadingTheReader.Realtime.Persistence/data/experiment-session-journal/`

## Snapshot File

### `experiment-session-snapshot.json`

What it contains:

- latest session id
- whether the session is active
- participant information
- selected eye tracker
- calibration and validation state
- current setup step status
- latest gaze sample
- reading session state

When it is written:

- every checkpoint interval by the background checkpoint worker
- also when important setup state changes, such as participant, eye tracker, calibration, and reading content
- at session start
- at session stop

What it is for:

- fast recovery of the latest known session state
- restoring the current session if the backend restarts
- checking whether a session was active when the backend crashed

Important note:

- this file is a checkpoint, not the full historical experiment archive

## Session Journal Directory

Each experiment session gets its own folder under:

- `experiment-session-journal/<session-id>/`

Example:

- `Backend/src/infrastructure/ReadingTheReader.Realtime.Persistence/data/experiment-session-journal/3f4c.../`

This folder contains the durable detailed session history.

### `initial-snapshot.json`

What it contains:

- the full experiment snapshot captured at the start of the session

When it is written:

- once, when the session starts

What it is for:

- reconstructing the initial state for replay export
- recovery after a crash

### `manifest.json`

What it contains:

- session id
- started timestamp
- whether the session completed cleanly
- completion source
- completed timestamp

When it is written:

- once at session start
- updated again when the session completes

What it is for:

- telling the system whether the journal belongs to a completed or interrupted session

### `lifecycle-events.jsonl`

What it contains:

- one JSON object per line
- lifecycle events such as session started or session stopped

When it is written:

- immediately when lifecycle events occur

What it is for:

- preserving the session timeline

### `gaze-samples.jsonl`

What it contains:

- one JSON object per line
- recorded gaze samples with timestamps and sequence numbers

When it is written:

- during the session while gaze data is flowing
- written in buffered batches, not one disk write per sample
- flushed when either:
- the gaze buffer reaches the configured batch size
- the background flush interval is reached
- the session completes
- the system loads recovery data

Current default settings:

- `JournalGazeBatchSize = 64`
- `JournalGazeFlushIntervalMilliseconds = 250`

What it is for:

- preserving high-frequency gaze history without waiting until experiment finish
- reducing data loss if the backend crashes

### `reading-session-states.jsonl`

What it contains:

- one JSON object per line
- reading content and reading presentation state changes

When it is written:

- when the reading session is configured or updated
- when the session starts and the reading state is recorded

What it is for:

- reconstructing what content and presentation the participant saw

### `participant-viewport-events.jsonl`

What it contains:

- one JSON object per line
- participant viewport updates such as dimensions and scroll position

When it is written:

- whenever participant viewport state changes

What it is for:

- reconstructing viewport context for replay and analysis

### `reading-focus-events.jsonl`

What it contains:

- one JSON object per line
- reading focus updates such as token or block focus

When it is written:

- whenever reading focus changes

What it is for:

- reconstructing where in the content the participant was focusing

### `intervention-events.jsonl`

What it contains:

- one JSON object per line
- intervention records triggered during the session

When it is written:

- immediately when an intervention is applied

What it is for:

- preserving the intervention history for replay and analysis

## Latest Replay Export

### `experiment-session-export.json`

What it contains:

- the latest completed replay export
- metadata
- statistics
- initial snapshot
- final snapshot
- lifecycle events
- gaze samples
- reading session states
- viewport events
- focus events
- intervention events

When it is written:

- when the session stops cleanly

What it is for:

- providing the latest finished export without needing to rebuild it manually

Important note:

- if the backend crashes before finish, this file may not exist yet
- in that case, recovery should use the snapshot plus journal files instead

## Saved Replay Exports

### Files under `experiment-replay-exports/`

What they contain:

- user-saved replay exports in JSON or CSV format

When they are written:

- only when the user explicitly saves an export

What they are for:

- keeping named exports for later download and analysis

## Write Frequency Summary

### Written continuously during the session

- `gaze-samples.jsonl`
- `lifecycle-events.jsonl`
- `reading-session-states.jsonl`
- `participant-viewport-events.jsonl`
- `reading-focus-events.jsonl`
- `intervention-events.jsonl`

### Written periodically

- `experiment-session-snapshot.json`

### Written once at session start

- `initial-snapshot.json`
- initial `manifest.json`

### Written at session completion

- updated `manifest.json`
- `experiment-session-export.json`

### Written only on explicit save

- named files in `experiment-replay-exports/`

## Recovery Model

If the backend crashes during an experiment:

- `experiment-session-snapshot.json` gives the latest checkpoint
- the journal directory gives the detailed event history already written to disk
- `gaze-samples.jsonl` may lose only the latest small in-memory buffer, not the whole session

That is why the journal is the important resilience layer, while the snapshot is the fast recovery checkpoint.
