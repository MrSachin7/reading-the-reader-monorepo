# Data Export Analysis

## Scope

This document analyzes the current experiment export and replay implementation in the repository as of `2026-04-01`.

The goal is to answer four questions without changing code yet:

1. What data is exported when an experiment is finished?
2. What are the implemented schemas for JSON and CSV export?
3. What parts of that export are actually consumed by the replay feature?
4. Based on the implemented replay flow, product requirements, and thesis docs, what data appears genuinely needed for replay, reproducibility, and downstream analysis?

This analysis is based on code and repo documentation only. It does not propose or implement optimizations yet.

## Executive Summary

- A replay export is built in the backend when a session is stopped or finished, not continuously during the session.
- The export contains:
  - metadata
  - statistics
  - an `initialSnapshot`
  - a `finalSnapshot`
  - seven event streams
- The JSON export is a real object model. The CSV export is not a flattened analytical CSV. It is a row-oriented wrapper around embedded JSON payloads.
- The export currently includes a lot of duplicated state:
  - full session snapshots
  - full reading-session snapshots inside state events
  - intervention history embedded in snapshots and also emitted as dedicated intervention events
  - full markdown content repeated in multiple places
- The replay frontend only uses a subset of the exported data. Important exported areas like `calibration`, `setup`, and `connectedClients` are exported by the backend but dropped by the replay parser.
- `attentionSummary` is exported only inside reading-session snapshots. There is no dedicated historical `attentionSummary` event stream, so replay cannot reconstruct its timeline with the same fidelity as gaze, focus, viewport, interventions, and proposals.
- The current export surface contains sensitive research data:
  - participant name and demographics
  - eye-tracker serial number
  - full reading material markdown
- Export download and saved-export endpoints are currently anonymous.
- The requirements mention annotations, but no annotation feature or annotation export schema exists in the codebase.

## Main Code Paths Reviewed

- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Session/ExperimentSessionManager.cs`
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Replay/ExperimentReplayExport.cs`
- `Backend/src/infrastructure/ReadingTheReader.Realtime.Persistence/ExperimentReplayExportSerializer.cs`
- `Backend/src/infrastructure/ReadingTheReader.Realtime.Persistence/FileExperimentReplayExportStoreAdapter.cs`
- `Backend/src/ReadingTheReader.WebApi/ExperimentSessionEndpoints/DownloadExperimentExportEndpoint.cs`
- `Backend/src/ReadingTheReader.WebApi/ExperimentSessionEndpoints/CreateSavedExperimentReplayExportEndpoint.cs`
- `Frontend/src/lib/experiment-replay.ts`
- `Frontend/src/modules/pages/replay/index.tsx`
- `Frontend/src/components/experiment/experiment-completion-actions.tsx`
- `docs/frontend/requirements.md`

## Export Lifecycle

### When the export is created

The backend creates the latest replay export inside `StopSessionCoreAsync(...)` in `ExperimentSessionManager`.

That path is reached by:

- `FinishSessionAsync(...)`
- `StopSessionAsync(...)`

So the export is created when the session is stopped or finished, not while it is still live.

### What happens on finish/stop

On session stop, the backend:

1. marks the session inactive
2. records a `session-stopped` lifecycle event
3. captures a final `ExperimentSessionSnapshot`
4. builds an `ExperimentReplayExport`
5. saves it as the latest replay export
6. broadcasts `experimentStopped`

### How users access it

There are two different export flows:

1. Latest download
   - `GET /api/experiment-session/export?format=json|csv`
   - returns the latest completed export serialized on demand as JSON or CSV
2. Saved named exports
   - `POST /api/experiment-replay-exports`
   - `GET /api/experiment-replay-exports`
   - `GET /api/experiment-replay-exports/{id}`

Important detail:

- a saved export may be stored on disk as JSON or CSV
- but `GET /api/experiment-replay-exports/{id}` returns the deserialized `ExperimentReplayExport` object as JSON over HTTP
- so the replay page's "load saved export" path does not test CSV parsing; CSV parsing is only exercised when a user uploads a raw CSV file into replay

### Storage behavior

- The latest replay export is always stored via `IExperimentReplayExportStoreAdapter.SaveLatestAsync(...)`.
- Named saved exports are created from that latest export later via `SaveLatestReplayExportAsync(...)`.
- With the current default app config, `RealtimePersistence.Provider` is `InMemory`, so replay exports are not persisted across backend restarts by default.
- If the provider is switched to `File`, the configured paths are:
  - latest export: `./data/experiment-session-export.json`
  - saved exports dir: `./data/experiment-replay-exports`

## Current Top-Level Export Schema

### JSON document shape

JSON uses camelCase because the serializer sets `JsonNamingPolicy.CamelCase`.

```ts
type ExperimentReplayExport = {
  metadata: ExperimentReplayMetadata
  statistics: ExperimentReplayStatistics
  initialSnapshot: ExperimentSessionSnapshot
  finalSnapshot: ExperimentSessionSnapshot
  lifecycleEvents: ExperimentLifecycleEventRecord[]
  gazeSamples: GazeSampleRecord[]
  readingSessionStates: ReadingSessionStateRecord[]
  participantViewportEvents: ParticipantViewportEventRecord[]
  readingFocusEvents: ReadingFocusEventRecord[]
  decisionProposalEvents: DecisionProposalEventRecord[]
  interventionEvents: InterventionEventRecord[]
}
```

### Metadata

```ts
type ExperimentReplayMetadata = {
  format: string
  version: number
  exportedAtUnixMs: number
  sessionId: string | null
  completionSource: string
  startedAtUnixMs: number
  endedAtUnixMs: number | null
  durationMs: number | null
  savedName?: string | null
}
```

Important detail: `metadata.format` is not `json` or `csv`.

It is a schema/document identifier and is currently hard-coded to:

- `reading-the-reader.experiment-replay`

So the field name `format` is semantically misleading. The actual transport/file format is chosen externally by the serializer and by the download endpoint query string.

### Statistics

```ts
type ExperimentReplayStatistics = {
  lifecycleEventCount: number
  gazeSampleCount: number
  readingSessionStateCount: number
  participantViewportEventCount: number
  readingFocusEventCount: number
  decisionProposalEventCount: number
  interventionEventCount: number
}
```

These are only counts of the top-level event arrays. They are not derived-quality metrics, checksums, or summaries of nested snapshot contents.

## Nested Schema Inventory

### ExperimentSessionSnapshot

The backend export includes the full backend session snapshot shape:

```ts
type ExperimentSessionSnapshot = {
  sessionId: string | null
  isActive: boolean
  startedAtUnixMs: number
  stoppedAtUnixMs: number | null
  participant: Participant | null
  eyeTrackerDevice: EyeTrackerDevice | null
  calibration: CalibrationSessionSnapshot
  setup: ExperimentSetupSnapshot
  receivedGazeSamples: number
  latestGazeSample: GazeData | null
  connectedClients: number
  liveMonitoring: ExperimentLiveMonitoringSnapshot
  readingSession: LiveReadingSessionSnapshot | null
  decisionConfiguration: DecisionConfigurationSnapshot
  decisionState: DecisionRuntimeStateSnapshot
}
```

#### Participant

```ts
type Participant = {
  name: string
  age: number
  sex: string
  existingEyeCondition: string
  readingProficiency: string
}
```

#### Eye tracker

```ts
type EyeTrackerDevice = {
  name: string
  model: string
  serialNumber: string
  hasSavedLicence: boolean
}
```

#### GazeData

```ts
type GazeData = {
  deviceTimeStamp: number
  leftEyeX: number
  leftEyeY: number
  leftEyeValidity: string
  rightEyeX: number
  rightEyeY: number
  rightEyeValidity: string
}
```

Observed notes:

- no pupil diameter or pupil validity fields are exported
- no screen-space gaze coordinates are exported
- gaze values are sanitized before recording

#### Calibration snapshot

The full calibration snapshot is exported inside `initialSnapshot` and `finalSnapshot`.

This includes:

- calibration session id
- status and pattern
- start/update/complete timestamps
- calibration point states
- calibration run result
- validation snapshot
- validation result
- per-point validation metrics
- notes arrays

This means calibration results are present in the export, which aligns with the requirements, but only as snapshot state. There is no dedicated calibration event stream inside the replay export.

#### Setup snapshot

`setup` contains readiness and blocker state for:

- eye tracker
- participant
- calibration
- reading material

This is useful for operator state auditing, but it is not currently used by replay.

### LiveReadingSessionSnapshot

```ts
type LiveReadingSessionSnapshot = {
  content: ReadingContentSnapshot | null
  presentation: ReadingPresentationSnapshot
  appearance: ReaderAppearanceSnapshot
  participantViewport: ParticipantViewportSnapshot
  focus: ReadingFocusSnapshot
  latestIntervention: InterventionEventSnapshot | null
  recentInterventions: InterventionEventSnapshot[]
  attentionSummary: ReadingAttentionSummarySnapshot | null
}
```

#### Reading content

```ts
type ReadingContentSnapshot = {
  documentId: string
  title: string
  markdown: string
  sourceSetupId: string | null
  updatedAtUnixMs: number
}
```

Important note: the full markdown body is exported, not just a content id or hash.

#### Presentation

```ts
type ReadingPresentationSnapshot = {
  fontFamily: string
  fontSizePx: number
  lineWidthPx: number
  lineHeight: number
  letterSpacingEm: number
  editableByResearcher: boolean
}
```

#### Reader appearance

```ts
type ReaderAppearanceSnapshot = {
  themeMode: string
  palette: string
  appFont: string
}
```

#### Participant viewport

```ts
type ParticipantViewportSnapshot = {
  isConnected: boolean
  scrollProgress: number
  scrollTopPx: number
  viewportWidthPx: number
  viewportHeightPx: number
  contentHeightPx: number
  contentWidthPx: number
  updatedAtUnixMs: number
}
```

#### Reading focus

```ts
type ReadingFocusSnapshot = {
  isInsideReadingArea: boolean
  normalizedContentX: number | null
  normalizedContentY: number | null
  activeTokenId: string | null
  activeBlockId: string | null
  updatedAtUnixMs: number
}
```

#### Attention summary

```ts
type ReadingAttentionSummarySnapshot = {
  updatedAtUnixMs: number
  tokenStats: Record<string, {
    fixationMs: number
    fixationCount: number
    skimCount: number
    maxFixationMs: number
    lastFixationMs: number
  }>
  currentTokenId: string | null
  currentTokenDurationMs: number | null
  fixatedTokenCount: number
  skimmedTokenCount: number
}
```

Important note: the export stores this summary only inside snapshots and reading-session state snapshots. There is no top-level `attentionSummaryEvents` stream.

### Decision configuration and state

```ts
type DecisionConfigurationSnapshot = {
  conditionLabel: string
  providerId: string
  executionMode: string
}

type DecisionRuntimeStateSnapshot = {
  automationPaused: boolean
  activeProposal: DecisionProposalSnapshot | null
  recentProposalHistory: DecisionProposalSnapshot[]
}
```

### Decision proposal

```ts
type DecisionProposalSnapshot = {
  proposalId: string
  conditionLabel: string
  providerId: string
  executionMode: string
  status: string
  signal: {
    signalType: string
    summary: string
    observedAtUnixMs: number
    confidence: number | null
  }
  rationale: string
  proposedAtUnixMs: number
  resolvedAtUnixMs: number | null
  resolutionSource: string | null
  appliedInterventionId: string | null
  proposedIntervention: {
    source: string
    trigger: string
    reason: string
    moduleId: string | null
    parameters: Record<string, string | null> | null
    presentation: {
      fontFamily: string | null
      fontSizePx: number | null
      lineWidthPx: number | null
      lineHeight: number | null
      letterSpacingEm: number | null
      editableByResearcher: boolean | null
    }
    appearance: {
      themeMode: string | null
      palette: string | null
      appFont: string | null
    }
  }
}
```

### Intervention event

```ts
type InterventionEventSnapshot = {
  id: string
  source: string
  trigger: string
  reason: string
  appliedAtUnixMs: number
  appliedPresentation: ReadingPresentationSnapshot
  appliedAppearance: ReaderAppearanceSnapshot
  moduleId: string | null
  parameters: Record<string, string | null> | null
}
```

## Event Stream Schemas

All event streams carry:

- `sequenceNumber`
- a timestamp field
- `elapsedSinceStartMs`
- a payload snapshot

### Lifecycle events

```ts
type ExperimentLifecycleEventRecord = {
  sequenceNumber: number
  eventType: string
  source: string
  occurredAtUnixMs: number
  elapsedSinceStartMs: number | null
}
```

Current event types recorded in the export path:

- `session-started`
- `session-stopped`

### Gaze samples

```ts
type GazeSampleRecord = {
  sequenceNumber: number
  capturedAtUnixMs: number
  elapsedSinceStartMs: number | null
  sample: GazeData
}
```

### Reading-session state events

```ts
type ReadingSessionStateRecord = {
  sequenceNumber: number
  reason: string
  occurredAtUnixMs: number
  elapsedSinceStartMs: number | null
  session: LiveReadingSessionSnapshot
}
```

Current reasons recorded:

- `reading-session-configured`
- `session-started`
- `intervention-applied`

### Participant viewport events

```ts
type ParticipantViewportEventRecord = {
  sequenceNumber: number
  occurredAtUnixMs: number
  elapsedSinceStartMs: number | null
  viewport: ParticipantViewportSnapshot
}
```

### Reading focus events

```ts
type ReadingFocusEventRecord = {
  sequenceNumber: number
  occurredAtUnixMs: number
  elapsedSinceStartMs: number | null
  focus: ReadingFocusSnapshot
}
```

### Decision proposal events

```ts
type DecisionProposalEventRecord = {
  sequenceNumber: number
  occurredAtUnixMs: number
  elapsedSinceStartMs: number | null
  proposal: DecisionProposalSnapshot
}
```

### Intervention events

```ts
type InterventionEventRecord = {
  sequenceNumber: number
  occurredAtUnixMs: number
  elapsedSinceStartMs: number | null
  intervention: InterventionEventSnapshot
}
```

## CSV Export Schema

The CSV serializer does not flatten the replay model into analysis-friendly columns.

Instead it creates rows with this shape:

```ts
type ExperimentReplayCsvRow = {
  Section: string
  Index: number | null
  PayloadJson: string
}
```

The sections written today are:

- `metadata`
- `statistics`
- `initialSnapshot`
- `finalSnapshot`
- `lifecycleEvent`
- `gazeSample`
- `readingSessionState`
- `participantViewportEvent`
- `readingFocusEvent`
- `decisionProposalEvent`
- `interventionEvent`

Implications:

- the CSV is functionally a transport envelope, not a normalized analysis table
- nested objects remain embedded JSON strings inside `PayloadJson`
- consumers still need JSON parsing logic to use most of the content
- the frontend replay importer explicitly reconstructs the JSON object model from these rows before validation

## Field Provenance and Recording Behavior

| Export area | Recorded by | Trigger | Cadence | Notes |
| --- | --- | --- | --- | --- |
| `lifecycleEvents` | `RecordLifecycleEvent` | session start and stop | very low | captures source and absolute/relative time |
| `gazeSamples` | `RecordGazeSample` | every gaze callback | high | only records while at least one gaze subscriber exists |
| `readingSessionStates` | `RecordReadingSessionState` | reading material configured, session start, intervention applied | low | stores full `LiveReadingSessionSnapshot` each time |
| `participantViewportEvents` | `RecordParticipantViewportEvent` | participant view connect, viewport update, disconnect | medium/high | includes scroll and full viewport dimensions |
| `readingFocusEvents` | `RecordReadingFocusEvent` | focus updates and disconnect | medium/high | derived gaze-to-content state |
| `decisionProposalEvents` | `RecordDecisionProposalEvent` | proposal created, approved, rejected, superseded, auto-applied | medium | includes full proposal payload and proposed intervention |
| `interventionEvents` | `RecordInterventionEvent` | each applied intervention | low | includes applied presentation, appearance, module id, parameters |
| `attentionSummary` | not an export stream | reading attention updates | medium | only embedded in snapshots and state records |

Important collection detail:

- `OnGazeDataReceived(...)` returns immediately if `_gazeSubscribers` is empty.
- That means the exported raw gaze stream is not a complete hardware archive. It is the subset of gaze samples observed while at least one frontend client was actively subscribed to gaze streaming.

## What Replay Actually Consumes

### Replay import contract

The replay frontend validates imports with Zod in `Frontend/src/lib/experiment-replay.ts`.

It requires:

- the top-level export keys listed above
- `metadata.format === "reading-the-reader.experiment-replay"`

### Important mismatch: backend export vs replay parser

The backend exports the full `ExperimentSessionSnapshot`, but the replay parser only keeps this reduced snapshot shape:

- `sessionId`
- `isActive`
- `startedAtUnixMs`
- `stoppedAtUnixMs`
- `participant`
- `eyeTrackerDevice`
- `receivedGazeSamples`
- `latestGazeSample`
- `liveMonitoring`
- `readingSession`
- `decisionConfiguration`
- `decisionState`

That means these backend-exported snapshot fields are currently dropped during replay import:

- `calibration`
- `setup`
- `connectedClients`

### Replay-critical data

The replay player actually depends on:

- `metadata.startedAtUnixMs`
- `metadata.endedAtUnixMs` or `metadata.durationMs`
- `initialSnapshot.readingSession.content`
- `gazeSamples`
- `participantViewportEvents`
- `readingFocusEvents`
- `readingSessionStates`
- `interventionEvents`
- `decisionProposalEvents`

### Exported but currently underused or unused by replay UI

- `statistics`
  - parsed but not surfaced in the replay UI
- `lifecycleEvents`
  - parsed and indexed in frame building, but not shown in the replay timeline UI
- `initialSnapshot.calibration`
  - exported by backend, dropped by parser
- `initialSnapshot.setup`
  - exported by backend, dropped by parser
- `initialSnapshot.connectedClients`
  - exported by backend, dropped by parser
- `finalSnapshot.calibration`
  - exported by backend, dropped by parser
- `finalSnapshot.setup`
  - exported by backend, dropped by parser
- `finalSnapshot.connectedClients`
  - exported by backend, dropped by parser
- `readingSession.attentionSummary`
  - available as snapshot state, but there is no historical timeline playback for it
- `participantViewport.viewportWidthPx`, `viewportHeightPx`, `contentWidthPx`, `contentHeightPx`
  - exported and parsed, but replay rendering mainly uses scroll progress and scroll top

## Duplication in the Current Export

The export is structurally rich, but it repeats the same information in multiple places.

### Snapshot duplication

- `initialSnapshot` and `finalSnapshot` both include full session objects.
- Both snapshots include nested reading-session state.
- Both snapshots include full calibration and setup structures.

### State duplication

- `readingSessionStates` contains full `LiveReadingSessionSnapshot` payloads, not deltas.
- Every such state event can repeat:
  - full markdown content
  - presentation
  - appearance
  - viewport
  - focus
  - latest intervention
  - recent interventions
  - attention summary

### Intervention duplication

- An intervention appears as:
  - `interventionEvents[*].intervention`
  - `readingSessionStates[*].session.latestIntervention`
  - `readingSessionStates[*].session.recentInterventions`
  - `finalSnapshot.readingSession.latestIntervention`
  - `finalSnapshot.readingSession.recentInterventions`

### Content duplication

- The full `markdown` document is exported in:
  - `initialSnapshot.readingSession.content.markdown`
  - `finalSnapshot.readingSession.content.markdown`
  - every `readingSessionStates[*].session.content.markdown`

### Attention duplication without time-series fidelity

- `attentionSummary` is repeated inside snapshots
- but there is no standalone event series for attention updates
- this means it is duplicated as state while still being incomplete as a historical signal

## Requirements Coverage Against Current Export

Based on `docs/frontend/requirements.md`:

### Clearly implemented

- JSON export support
- CSV export support
- schema versioning
- session metadata
- raw gaze sample logging
- intervention event logging
- calibration results in exported session snapshots
- configuration metadata via session snapshots and decision config

### Partially implemented

- derived gaze events
  - current export includes `readingFocusEvents`
  - attention-derived summaries exist, but not as a dedicated time-series export

### Not implemented in the export

- annotations
  - requirements explicitly mention them
  - no annotation feature or annotation schema was found

## What Data Appears Actually Needed

This section is intentionally descriptive, not prescriptive. It identifies the data that appears necessary based on the implemented replay feature, the requirements, and the thesis/research framing.

### A. Data needed for replay playback

These appear essential for reproducing the participant-facing reading session:

- session timing
  - start time
  - end time or duration
- content baseline
  - `documentId`
  - `title`
  - `markdown`
- reading presentation baseline
  - font family
  - font size
  - line width
  - line height
  - letter spacing
- reader appearance baseline
  - theme mode
  - palette
  - app font
- viewport history
  - scroll progress
  - scroll top
  - enough viewport dimensions to interpret mirror fidelity
- reading focus history
  - in/out of reading area
  - normalized content coordinates
  - active token id
  - active block id
- intervention history
  - source
  - trigger
  - reason
  - applied timestamp
  - applied presentation
  - applied appearance
  - module id
  - module parameters

### B. Data needed for replay with gaze evidence

If replay is expected to show actual gaze evidence, not just focus-derived state, the following appears necessary:

- raw gaze samples
  - capture timestamp
  - device timestamp
  - left/right eye coordinates
  - left/right validity

### C. Data needed for experimental reproducibility

These appear important for explaining what experimental condition ran:

- session id
- participant descriptor fields or a pseudonymous equivalent
- eye-tracker model and possibly device identity
- calibration result summary
- reading material identity and source setup id
- decision configuration
  - condition label
  - provider id
  - execution mode
- proposal history
  - rationale
  - signal
  - status transitions
- intervention provenance
  - module id
  - parameters
  - source

### D. Data needed for downstream analysis

For later analysis of reading behavior and intervention timing, the following appears materially useful:

- raw gaze stream
- derived focus stream
- viewport stream
- intervention stream
- proposal stream
- calibration quality summary
- content identity
- experiment timing

### E. Data that looks important but is currently incomplete

- annotations
  - required in docs, absent in implementation
- attention-summary history
  - current export preserves snapshots, not the historical update stream
- explicit software/version provenance
  - no app build version, git commit, or contract version beyond schema version `1`
- explicit analysis-ready condition metadata
  - condition label exists, but a richer experiment-condition record is not exported

## Sensitive Data and Exposure Surface

The current export includes sensitive or potentially identifying research data:

- participant name
- participant age
- participant sex
- participant eye-condition text
- participant reading-proficiency text
- eye-tracker serial number
- full reading material markdown

Operationally important:

- `DownloadExperimentExportEndpoint` is anonymous
- `CreateSavedExperimentReplayExportEndpoint` is anonymous
- `GetSavedExperimentReplayExportsEndpoint` is anonymous
- `GetSavedExperimentReplayExportByIdEndpoint` is anonymous

So the current replay export surface is not just verbose. It is also broadly exposed unless deployment puts additional controls in front of these endpoints.

## Key Findings to Carry Into Future Optimization Work

These are the main factual conclusions from the current implementation:

1. The export is a rich replay archive, not a lean analysis dataset.
2. The CSV format is a serialized wrapper around JSON, not a truly tabular research export.
3. The backend exports more snapshot data than the replay frontend actually consumes.
4. Some of the most repeated data is the largest data:
   - full markdown
   - full reading-session snapshots
   - repeated intervention state
5. Some important research-facing data is missing or incomplete:
   - annotations
   - historical attention-summary stream
   - explicit build/protocol provenance
6. The exported gaze stream is subscription-dependent, not guaranteed to be a full raw hardware log.
7. The export currently carries sensitive participant and device data through anonymous endpoints.

## Files Reviewed

- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Replay/ExperimentReplayExport.cs`
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Session/ExperimentSessionManager.cs`
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Session/ExperimentSessionSnapshot.cs`
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Reading/LiveReadingSessionSnapshot.cs`
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Decisioning/DecisionStrategyContracts.cs`
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Calibration/CalibrationContracts.cs`
- `Backend/src/core/ReadingTheReader.core.Domain/GazeData.cs`
- `Backend/src/core/ReadingTheReader.core.Domain/Participant.cs`
- `Backend/src/core/ReadingTheReader.core.Domain/EyeTrackerDevice.cs`
- `Backend/src/infrastructure/ReadingTheReader.Realtime.Persistence/ExperimentReplayExportSerializer.cs`
- `Backend/src/infrastructure/ReadingTheReader.Realtime.Persistence/FileExperimentReplayExportStoreAdapter.cs`
- `Backend/src/infrastructure/ReadingTheReader.Realtime.Persistence/InMemoryExperimentReplayExportStoreAdapter.cs`
- `Backend/src/infrastructure/ReadingTheReader.Realtime.Persistence/ExperimentPersistenceOptions.cs`
- `Backend/src/ReadingTheReader.WebApi/ExperimentSessionEndpoints/DownloadExperimentExportEndpoint.cs`
- `Backend/src/ReadingTheReader.WebApi/ExperimentSessionEndpoints/CreateSavedExperimentReplayExportEndpoint.cs`
- `Backend/src/ReadingTheReader.WebApi/ExperimentSessionEndpoints/GetSavedExperimentReplayExportsEndpoint.cs`
- `Backend/src/ReadingTheReader.WebApi/ExperimentSessionEndpoints/GetSavedExperimentReplayExportByIdEndpoint.cs`
- `Backend/src/ReadingTheReader.WebApi/appsettings.json`
- `Frontend/src/lib/experiment-replay.ts`
- `Frontend/src/lib/experiment-export.ts`
- `Frontend/src/lib/experiment-session.ts`
- `Frontend/src/modules/pages/replay/index.tsx`
- `Frontend/src/modules/pages/replay/components/ReplayMetadataColumn.tsx`
- `Frontend/src/modules/pages/replay/components/ReplayReaderColumn.tsx`
- `Frontend/src/components/experiment/experiment-completion-actions.tsx`
- `docs/frontend/requirements.md`
