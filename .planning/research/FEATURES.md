# Project Research: Features

## Research Question

Which features are table stakes for a researcher-operated adaptive reading platform, and which features are the differentiating thesis-specific capabilities that should shape v1 requirements?

## Feature Framing

This is not a consumer reading product. It is a research platform that happens to contain a participant reading experience. That changes feature prioritization:

- researcher operation is central
- experiment repeatability matters
- live observability matters
- modular extension matters
- exportability matters

## Category 1: Device and session setup

### Table stakes

- detect connected eye trackers
- select a device
- apply or validate required licensing
- guide setup in a clear sequence
- block invalid session starts

### Thesis differentiators

- calibration and validation fully inside the application
- calibration quality visible before experiment start
- setup workflow optimized for minimal experimenter error

### Current repo evidence

- setup and session orchestration already exist in `Frontend/src/modules/pages/experiment`
- calibration flows already exist in `Frontend/src/modules/pages/calibration`
- backend support exists in `Backend/src/ReadingTheReader.WebApi/CalibrationEndpoints` and `Backend/src/ReadingTheReader.WebApi/EyeTrackerEndpoints`

## Category 2: Participant reading experience

### Table stakes

- load and render readable experiment content
- stable typography and presentation controls
- readable full-screen or immersive reading surface
- consistent rendering coordinates for gaze mapping

### Thesis differentiators

- micro-interventions that adapt the reading experience without losing context
- emphasis on rhythmic reading flow and low perceived disruption
- Markdown-first reading pipeline with token/block level structure suitable for gaze-linked adaptation

### Current repo evidence

- reading view exists in `Frontend/src/modules/pages/reading/pages/ReadingPage.tsx`
- reader shell logic exists in `Frontend/src/modules/pages/reading/components/ReaderShell.tsx`
- reading presentation helpers exist in `Frontend/src/modules/pages/reading/lib`

## Category 3: Researcher live observation and control

### Table stakes

- live researcher view of the participant session
- visible session health indicators
- ability to start/stop and monitor the experiment

### Thesis differentiators

- second-screen mirror of the participant reading experience
- manual intervention application during live sessions
- visibility into intervention causes and session state changes
- support for comparing manual and automated/hybrid strategies in the same platform

### Current repo evidence

- live researcher view exists in `Frontend/src/modules/pages/researcher/current-live/index.tsx`
- websocket transport exists in `Frontend/src/lib/gaze-socket.ts`
- backend session coordination exists in `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionManager.cs`

## Category 4: Decision strategies

### Table stakes

- manual intervention triggering
- the ability to disable automation entirely for control conditions

### Thesis differentiators

- interchangeable decision strategy boundary
- support for manual, rule-based, automated, and hybrid experiment modes
- support for external AI-style decision providers without rewriting the core app

### Current repo evidence

- intervention flow already exists, but the thesis still needs a stronger and more explicit strategy boundary
- the current session/intervention runtime lives around `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime`

## Category 5: Intervention modules

### Table stakes

- ability to apply readable UI changes
- intervention logging with source and timing

### Thesis differentiators

- interventions as additive modules rather than hardcoded one-offs
- clear declaration of required inputs and supported parameters
- plug-and-play capability that future teams can extend

### Current repo evidence

- intervention-related runtime logic already exists in `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ReadingInterventionRuntime.cs`
- researcher-triggered intervention behavior is visible in `Frontend/src/modules/pages/researcher/current-live/index.tsx`

## Category 6: Experiment control and reproducibility

### Table stakes

- start session
- stop session
- save/export session data
- capture session metadata

### Thesis differentiators

- support for explicit experimental conditions like manual-only, automated-only, hybrid, and control
- replay-ready exports that preserve session history
- session records good enough to defend reproducibility

### Current repo evidence

- export and replay features already exist in `Backend/src/ReadingTheReader.WebApi/ExperimentSessionEndpoints` and `Frontend/src/modules/pages/replay`
- replay/export helpers exist in `Frontend/src/lib/experiment-export.ts` and `Frontend/src/lib/experiment-replay.ts`

## Category 7: Study tooling

### Table stakes

- enough instrumentation and export quality to support user studies

### Lower-priority but valuable thesis features

- researcher notes or runtime annotations
- condition-management polish
- more explicit study-run workflows
- embedded post-session evaluation capture

### Priority note

- This category is valuable, but it should not outrank the architecture, live experiment runtime, or modularity story if time gets tight.

## Recommended v1 feature emphasis

The v1 thesis scope should prioritize:

- hardware setup and calibration
- participant reading in Markdown
- realtime researcher mirroring
- manual intervention control
- context-preserving adaptation behavior
- export and replay support
- defendable module boundaries for interventions and decision strategies

## Features to defer or exclude

### Explicitly out

- built-in AI model implementation
- PDF reading support

### Good candidates for later or lighter implementation

- richer study tooling beyond what is needed to run and defend experiments
- extra analytics polish
- production/deployment hardening beyond thesis needs

## Feature conclusion

The current repo already covers much of the table-stakes adaptive reading platform. The thesis-specific v1 work should focus less on adding surface area and more on sharpening the modularity, decision/intervention boundaries, context-preserving adaptation behavior, and researcher-defensible experiment workflows.
