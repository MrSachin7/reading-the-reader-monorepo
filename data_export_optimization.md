# Data Export Optimization Proposal

## Purpose

This document proposes a new export shape that is:

- smaller than the current replay archive
- richer in eye-tracker signal quality
- better suited for AI decision models and pluggable intervention providers
- still sufficient to support a future replay implementation

This is a proposal only. It does not describe the current implementation. For the current state, see [data_export.md](C:/Users/s243871/reading-the-reader-monorepo/data_export.md).

## Design Goal

The export should stop being a UI-state dump and become a research-grade experiment record.

That means the canonical export should prioritize:

1. high-signal raw sensing data
2. stable semantic event streams
3. one authoritative content baseline
4. enough replay context to reconstruct the reading session later
5. minimal duplication
6. minimal exposure of irrelevant or private operator/UI state

## Core Recommendation

Replace the current snapshot-heavy replay archive with a layered schema:

1. `manifest`
2. `experiment`
3. `content`
4. `sensing`
5. `derived`
6. `interventions`
7. `replay`
8. `annotations`
9. optional `private` or `debug` annex

The important architectural shift is this:

- keep raw sensing raw
- keep semantic interpretation explicit
- stop exporting entire frontend/backend runtime snapshots repeatedly

## What To Cut

These fields are currently exported but should not be part of the new canonical export unless moved into an optional audit/debug annex.

### Remove from canonical export

- `setup`
  - readiness state
  - blockers
  - step indexes
- `connectedClients`
- `liveMonitoring`
  - this is transport/runtime state, not experiment evidence
- repeated `latestGazeSample`
- repeated `receivedGazeSamples` inside snapshots
- full `readingSessionStates[*].session`
  - this is the largest source of duplication
- repeated `latestIntervention` and `recentInterventions` inside snapshots
- repeated full markdown in every state event
- repeated viewport/focus/appearance/presentation state embedded inside whole-session snapshots

### Move to optional `private` or `debug` annex

- participant name
- raw eye-tracker serial number
- setup readiness snapshots
- connected client counts
- calibration workflow notes intended only for operator debugging
- any future backend error or operational diagnostics

## What To Add

The current adapter only exports:

- display-area gaze point per eye
- gaze validity per eye
- device timestamp

The installed `Tobii.Research.x64 1.11.0.1334` package also exposes more useful data on the gaze event path that should be added to the raw sensing stream:

- `SystemTimeStamp`
- per-eye pupil diameter
- per-eye pupil validity
- per-eye gaze point in user coordinates (3D)
- per-eye gaze origin in user coordinates (3D)
- per-eye gaze origin in track-box coordinates
- per-eye gaze-origin validity

These should be preserved in the canonical sensing stream because they are directly valuable for:

- AI model input
- plugin decisions
- quality filtering
- head-position robustness
- later derivation of better reading-state signals

## Recommended Data Model

## 1. `manifest`

Minimal envelope metadata.

```ts
type ExportManifest = {
  schema: "rtr.experiment-export"
  version: 2
  exportedAtUnixMs: number
  completionSource: string
  exportProfile: "core" | "core+private" | "core+debug"
  producer: {
    appName: "reading-the-reader"
    backendSdk: "Tobii.Research.x64"
    backendSdkVersion: "1.11.0.1334"
    exporterVersion: string
  }
}
```

Why:

- keeps schema versioning clear
- separates schema identity from transport format
- adds explicit producer provenance

## 2. `experiment`

Stable experiment/session context.

```ts
type ExperimentContext = {
  sessionId: string
  startedAtUnixMs: number
  endedAtUnixMs: number | null
  durationMs: number | null
  condition: {
    conditionLabel: string
    providerId: string
    executionMode: string
  }
  participant: {
    participantId: string
    age: number | null
    sex: string | null
    existingEyeCondition: string | null
    readingProficiency: string | null
  }
  device: {
    name: string | null
    model: string | null
    serialNumberHash: string | null
    hasSavedLicence: boolean | null
  }
  calibration: {
    pattern: string | null
    applied: boolean
    validationPassed: boolean
    quality: string | null
    averageAccuracyDegrees: number | null
    averagePrecisionDegrees: number | null
    sampleCount: number
  }
}
```

Changes from current export:

- keep participant demographics only if they are actual study variables
- replace participant name with `participantId`
- replace raw serial number with `serialNumberHash`
- keep calibration as compact summary, not full workflow snapshot

## 3. `content`

Store the reading baseline once.

```ts
type ContentBaseline = {
  documentId: string
  title: string
  markdown: string
  sourceSetupId: string | null
  updatedAtUnixMs: number
  contentHash: string
  tokenization: {
    strategy: string
    version: string
  }
}
```

Why:

- replay still needs the text body
- AI/plugins may need the text body
- token-referenced focus events need stable tokenization provenance

Important note:

The current export references `activeTokenId` and `activeBlockId` but does not explicitly version the tokenization strategy. That is fragile. The new schema should.

## 4. `sensing`

This becomes the canonical raw signal layer.

```ts
type EnrichedGazeSample = {
  seq: number
  deviceTimeStampUs: number
  systemTimeStampUs: number
  elapsedSinceStartMs: number
  left: EyeSample | null
  right: EyeSample | null
}

type EyeSample = {
  gazePoint2D: {
    x: number | null
    y: number | null
    validity: string
  }
  gazePoint3D: {
    x: number | null
    y: number | null
    z: number | null
  }
  pupil: {
    diameterMm: number | null
    validity: string
  }
  gazeOrigin3D: {
    x: number | null
    y: number | null
    z: number | null
    validity: string
  }
  gazeOriginTrackBox: {
    x: number | null
    y: number | null
    z: number | null
  } | null
}

type SensingStream = {
  gazeSamples: EnrichedGazeSample[]
}
```

Why this is better:

- keeps the export future-proof for AI and plugin use
- preserves timing quality with both device and system timestamps
- preserves pupil and head-position proxies
- keeps the stream raw instead of prematurely flattening it into current UI-only state

## 5. `derived`

Store semantic and model-ready derived signals as dedicated streams, not giant snapshots.

```ts
type DerivedStreams = {
  viewportEvents: ViewportEvent[]
  focusEvents: FocusEvent[]
  attentionEpisodes: AttentionEpisode[]
  decisionProposals: DecisionProposalEvent[]
}
```

### `viewportEvents`

```ts
type ViewportEvent = {
  seq: number
  occurredAtUnixMs: number
  elapsedSinceStartMs: number
  scrollProgress: number
  scrollTopPx: number
  viewportWidthPx: number
  viewportHeightPx: number
  contentWidthPx: number
  contentHeightPx: number
  isConnected: boolean
}
```

### `focusEvents`

```ts
type FocusEvent = {
  seq: number
  occurredAtUnixMs: number
  elapsedSinceStartMs: number
  isInsideReadingArea: boolean
  normalizedContentX: number | null
  normalizedContentY: number | null
  activeTokenId: string | null
  activeBlockId: string | null
}
```

### `attentionEpisodes`

Current export does not have a dedicated historical attention stream. It should.

```ts
type AttentionEpisode = {
  seq: number
  startedAtUnixMs: number
  endedAtUnixMs: number
  durationMs: number
  tokenId: string | null
  blockId: string | null
  classification: "fixation" | "skim"
  fixationMs: number
  fixationCountContribution: number
  skimCountContribution: number
}
```

This is better than embedding a giant `tokenStats` object repeatedly because:

- it is replayable
- it is model-friendly
- it can be aggregated later
- it preserves semantic structure without snapshot bloat

### `decisionProposals`

Keep the dedicated stream, but slim the payload to event semantics rather than full runtime-state duplication.

```ts
type DecisionProposalEvent = {
  seq: number
  occurredAtUnixMs: number
  elapsedSinceStartMs: number
  proposalId: string
  status: string
  conditionLabel: string
  providerId: string
  executionMode: string
  signalType: string
  signalSummary: string
  signalConfidence: number | null
  rationale: string
  resolutionSource: string | null
  appliedInterventionId: string | null
  proposedInterventionRef: string | null
}
```

## 6. `interventions`

Keep interventions as first-class events.

```ts
type InterventionEvent = {
  id: string
  seq: number
  occurredAtUnixMs: number
  elapsedSinceStartMs: number
  source: string
  trigger: string
  reason: string
  moduleId: string | null
  parameters: Record<string, string | null> | null
  appliedPresentation: {
    fontFamily: string
    fontSizePx: number
    lineWidthPx: number
    lineHeight: number
    letterSpacingEm: number
    editableByResearcher: boolean
  }
  appliedAppearance: {
    themeMode: string
    palette: string
    appFont: string
  }
}
```

Why:

- interventions are causally important
- replay needs them
- AI/plugin evaluation needs them
- they should remain explicit, not inferred from general state snapshots

## 7. `replay`

Replay should not depend on giant repeated snapshots. It should depend on:

- one baseline
- typed event streams
- optional compact checkpoints

```ts
type ReplayLayer = {
  baseline: {
    presentation: {
      fontFamily: string
      fontSizePx: number
      lineWidthPx: number
      lineHeight: number
      letterSpacingEm: number
      editableByResearcher: boolean
    }
    appearance: {
      themeMode: string
      palette: string
      appFont: string
    }
  }
  checkpoints?: ReplayCheckpoint[]
}

type ReplayCheckpoint = {
  tMs: number
  scrollProgress: number
  scrollTopPx: number
  activeTokenId: string | null
  activeBlockId: string | null
  currentPresentationRef: string | null
  currentAppearanceRef: string | null
}
```

Recommendation:

- start without checkpoints if event replay is fast enough
- add compact checkpoints later only if replay scrubbing needs them

Do not store full reading-session snapshots every time something changes.

## 8. `annotations`

This should be added because the requirements already call for runtime annotation support.

```ts
type AnnotationEvent = {
  id: string
  seq: number
  occurredAtUnixMs: number
  elapsedSinceStartMs: number
  author: string | null
  category: string | null
  note: string
  targetTokenId: string | null
  targetBlockId: string | null
}
```

## 9. Optional `private` or `debug` annex

Do not force this into the canonical export used for AI and plugin input.

Use an optional annex for:

- participant name
- raw serial number
- full calibration point-level workflow traces
- operator readiness/setup states
- transport diagnostics
- connected-client/runtime monitoring details

That keeps the canonical export high-signal and safer to share with models/plugins.

## What This Replaces in the Current Model

### Replace `initialSnapshot` and `finalSnapshot`

Replace with:

- `experiment`
- `content`
- `replay.baseline`
- optional compact checkpoints

### Replace `readingSessionStates`

Replace full-state snapshots with explicit event lanes:

- content configured
- presentation changed
- appearance changed
- viewport changed
- focus changed
- attention episode started/ended

This removes most of the duplication.

### Replace embedded intervention/proposal history inside snapshots

Use only:

- `interventions[]`
- `derived.decisionProposals[]`

No `latestIntervention`, no `recentInterventions`, no `recentProposalHistory` in the canonical replay export.

## Recommended Keep / Add / Drop Matrix

| Category | Keep | Add | Drop from canonical |
| --- | --- | --- | --- |
| Session | session id, start/end, condition | exporter provenance | setup readiness, connected clients |
| Participant | study-relevant participant vars | pseudonymous `participantId` | participant name |
| Device | name/model | serial hash, system timestamp provenance | raw serial number |
| Calibration | compact summary | none required for v2 core | full workflow snapshot and notes |
| Content | markdown once, ids, title | content hash, tokenization version | repeated content in state snapshots |
| Raw sensing | current 2D gaze and validity | pupil, gaze origin, 3D gaze point, system timestamp | none |
| Derived reading | viewport, focus | attention episodes | full reading-session snapshots |
| Decisions | proposal event stream | explicit signal refs if needed | full decision runtime snapshot history |
| Interventions | intervention event stream | none required | duplicated intervention state in snapshots |
| Replay | baseline + optional checkpoints | checkpoint layer if needed | full `initialSnapshot`/`finalSnapshot` dependency |
| Research notes | annotations | runtime note stream | none |

## Recommended Export Formats

## Canonical format

Use JSON as the canonical export format for:

- replay
- AI model ingestion
- plugin ingestion
- durable archival

## CSV strategy

Do not keep the current single-file wrapper CSV as the primary CSV strategy.

Instead, if CSV export is still required, generate separate analysis tables from the canonical JSON:

- `session.csv`
- `gaze_samples.csv`
- `viewport_events.csv`
- `focus_events.csv`
- `attention_episodes.csv`
- `decision_proposals.csv`
- `interventions.csv`
- `annotations.csv`

That would make CSV actually useful to analysts.

## Why This Schema Is Better For AI and Plugins

The proposed shape is better for AI/plugin work because it separates:

1. raw sensor evidence
2. derived reading-state evidence
3. intervention history
4. replay reconstruction data

That gives plugin authors three levels of consumption:

- raw-signal plugins
  - consume `sensing.gazeSamples`
- derived-signal plugins
  - consume `derived.focusEvents`, `attentionEpisodes`, `viewportEvents`
- causal evaluation plugins
  - consume `decisionProposals` + `interventions`

This is much better than forcing plugins to reverse-engineer meaning out of repeated UI snapshots.

## Minimal Replay Requirements Under the New Schema

A future replay can still be supported if the export keeps:

- content markdown
- tokenization/version info
- baseline presentation and appearance
- viewport event stream
- focus event stream
- intervention event stream
- timing metadata
- optionally raw gaze samples for overlay or diagnostics

It does not need:

- setup blockers
- connected client counts
- calibration workflow internals
- repeated whole-session snapshots

## Suggested Migration Direction

If this proposal is adopted, the implementation path should be:

1. expand raw eye-tracker capture first
   - add pupil, system timestamp, gaze origin, 3D gaze point
2. introduce a new export schema version
   - do not mutate the current schema silently
3. replace `readingSessionStates` with typed state/event streams
4. add `attentionEpisodes`
5. add `annotations`
6. move participant name and raw serial number into optional private annexes
7. refactor replay to consume the new canonical event model

## Recommended Final Shape

If reduced to one sentence:

The next export should be an event-sourced experiment record with one content baseline, one enriched raw gaze stream, a small number of semantic event lanes, explicit intervention/proposal history, and an optional private annex, instead of a repeated dump of runtime snapshots.
