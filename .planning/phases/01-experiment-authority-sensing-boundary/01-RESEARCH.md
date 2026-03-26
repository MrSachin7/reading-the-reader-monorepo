# Phase 1: Experiment Authority & Sensing Boundary - Research

**Date:** 2026-03-26
**Phase:** 01 - Experiment Authority & Sensing Boundary

## Planning Question

What architectural extraction work is needed to give the thesis platform one defensible experiment authority, a stable sensing seam, a separate reader-observation seam, and a full command-ingress boundary without destabilizing existing experiment flows?

## Current Runtime Assessment

### What already works

- [`Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionManager.cs`](Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionManager.cs) already acts as the backend source of truth for session lifecycle, setup gating, snapshot assembly, replay capture, gaze streaming subscription, participant viewport state, reading focus state, attention summaries, and intervention application.
- [`Backend/src/core/ReadingTheReader.core.Application/InfrastructureContracts/IEyeTrackerAdapter.cs`](Backend/src/core/ReadingTheReader.core.Application/InfrastructureContracts/IEyeTrackerAdapter.cs) already gives the codebase a hardware-facing seam that hides direct Tobii SDK usage.
- [`Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/CalibrationService.cs`](Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/CalibrationService.cs) is already a useful example of separating workflow concerns from raw eye-tracker operations.
- [`Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/EyeTrackerService.cs`](Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/EyeTrackerService.cs) already narrows some device-selection responsibilities away from direct Web API code.

### Where the architecture is currently too coupled

1. `ExperimentSessionManager` is both orchestration core and integration endpoint.
   It owns session authority, but it also parses inbound WebSocket commands, manages gaze streaming lifecycle, accepts participant-side observation updates, applies interventions, and builds replay/export history.

2. Transport is coupled to orchestration.
   [`Backend/src/ReadingTheReader.WebApi/Websockets/WebSocketConfiguration.cs`](Backend/src/ReadingTheReader.WebApi/Websockets/WebSocketConfiguration.cs) forwards raw envelope types directly into `HandleInboundMessageAsync`, which means the orchestration service understands transport message names and payload parsing.

3. Reader-observation state is mixed into the same boundary as session authority.
   Viewport, focus, and attention-summary updates are not hardware sensing, but they currently enter and mutate the same manager directly.

4. The public `IExperimentSessionManager` surface is too broad.
   [`Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/IExperimentSessionManager.cs`](Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/IExperimentSessionManager.cs) exposes session authority methods, observation updates, replay access, and transport handlers in one contract.

5. There is not yet a single application-level ingress model.
   REST endpoints are mixed: some go through specific services, while others call the session manager directly. WebSocket routing bypasses a dedicated command boundary entirely.

## Recommended Target Boundaries

### 1. Experiment Orchestration Authority

Keep one backend-owned experiment runtime authority, but narrow its responsibility to:

- owning canonical experiment/session state
- coordinating lifecycle transitions
- enforcing setup/session invariants
- delegating to sensing, reader observation, intervention, persistence, and broadcast collaborators

This should remain the only component that can authoritatively transition experiment lifecycle state.

### 2. Sensing Boundary

The sensing boundary should be device-facing and Tobii-agnostic. It should own:

- device discovery
- active device selection and license application
- calibration and validation capabilities
- start/stop of raw gaze acquisition
- raw gaze sample emission

It should not own:

- WebSocket message names
- participant viewport/focus state
- intervention decisions
- reader UI adaptation

The existing `IEyeTrackerAdapter` is a good starting point, but planning should decide whether to keep it as the sensing contract or wrap it in a narrower application-facing sensing interface.

### 3. Reader-Observation Boundary

Reader observation should be a separate application boundary responsible for:

- participant viewport updates
- reading focus updates
- attention summaries and other derived reading-state observations

This boundary should be distinct from hardware sensing because it comes from participant-side UI/runtime observation rather than from the Tobii device.

### 4. Command-Ingress Boundary

Introduce a full command-ingress layer so that both REST and WebSocket translate transport payloads into application commands before orchestration handles them.

Recommended responsibilities:

- Web API / WebSocket transport parses HTTP/JSON/WebSocket frames only
- ingress handlers map them into application commands
- orchestration runtime receives typed commands or calls from ingress handlers, not raw transport envelopes

This is the cleanest way to satisfy the user’s requirement that modules depend on interfaces rather than concrete transport details.

## Safe Refactor Strategy

### Recommended migration style

Incremental extraction around the current runtime, not a rewrite-from-scratch.

Why:

- `ExperimentSessionManager` already encodes real lifecycle rules and replay/export chronology.
- setup/calibration/session start is thesis-critical and should not be destabilized by a total rewrite
- the repo has limited automated coverage for orchestration behavior right now

### Recommended order

1. Add characterization tests around current orchestration behavior.
2. Extract transport ingress out of `ExperimentSessionManager`.
3. Separate reader-observation handling from core orchestration responsibilities.
4. Narrow sensing responsibilities behind a stable contract.
5. Reduce the public orchestration interface so later decision-strategy and intervention phases build on smaller seams.

This order preserves existing behavior while making the architectural story visibly stronger after each slice.

## Candidate Plan Slices

### Slice A: Runtime Contract Audit and Guardrail Tests

Purpose:

- document the current authority model in code
- add tests around existing orchestration invariants before moving responsibilities

Likely file areas:

- `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/*`
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionManager.cs`
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/IExperimentSessionManager.cs`

Expected outcome:

- failing tests would catch lifecycle/regression issues while extracting boundaries

### Slice B: Command-Ingress Extraction

Purpose:

- remove raw WebSocket message handling from orchestration
- align REST and WebSocket around application-level commands

Likely file areas:

- `Backend/src/ReadingTheReader.WebApi/Websockets/WebSocketConfiguration.cs`
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/MessageTypes.cs`
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionManager.cs`
- new ingress-oriented application contracts/services under `ApplicationContracts/Realtime/`
- selected endpoint files under `Backend/src/ReadingTheReader.WebApi/*Endpoints/`

Expected outcome:

- transport no longer routes raw message types directly into orchestration

### Slice C: Reader-Observation Boundary Extraction

Purpose:

- split participant viewport, reading focus, and attention-summary updates out of the broad session-manager contract

Likely file areas:

- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionManager.cs`
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/IExperimentSessionManager.cs`
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/LiveReadingSessionSnapshot.cs`
- `Frontend/src/lib/gaze-socket.ts`

Expected outcome:

- reader-observation updates become an explicit boundary, separate from sensing and transport ingress

### Slice D: Sensing Boundary Hardening

Purpose:

- keep Tobii-specific details behind a cleaner sensing seam and reduce orchestration’s direct knowledge of hardware lifecycle

Likely file areas:

- `Backend/src/core/ReadingTheReader.core.Application/InfrastructureContracts/IEyeTrackerAdapter.cs`
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/EyeTrackerService.cs`
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/CalibrationService.cs`
- `Backend/src/infrastructure/ReadingTheReader.TobiiEyetracker/TobiiEyeTrackerAdapter.cs`

Expected outcome:

- downstream modules can depend on sensing capabilities without carrying Tobii semantics everywhere

### Slice E: Composition Root and Contract Cleanup

Purpose:

- register the new boundaries cleanly and shrink oversized public contracts

Likely file areas:

- `Backend/src/core/ReadingTheReader.core.Application/ApplicationModuleInstaller.cs`
- `Backend/src/ReadingTheReader.WebApi/Program.cs`
- any new or narrowed interfaces created during slices B through D

Expected outcome:

- contributor-visible module ownership becomes much clearer, which directly supports `MOD-05`

## Parallel Workstream Guidance

For a two-person team, the safest split is:

- Workstream 1: command-ingress extraction plus orchestration contract cleanup
- Workstream 2: characterization tests plus reader-observation boundary prep

Do not split one person into Phase 1 and one into Phase 2 yet. Phase 2 depends on the exact contracts produced here.

## Verification Strategy

The phase must prove real separation, not just renamed classes.

### Evidence that should exist after execution

1. Transport no longer injects raw WebSocket envelopes directly into orchestration.
2. The orchestration contract no longer exposes unrelated concerns in one oversized surface.
3. Reader observation is handled through a separate seam from hardware sensing.
4. Tobii-specific details remain behind hardware-facing adapters/contracts.
5. Existing session lifecycle, replay/export chronology, and calibration gating still work.

### Best automated checks for this repo

- xUnit tests around session start/stop readiness, snapshot evolution, and observation updates
- tests proving message/command routing is decoupled from raw WebSocket handling
- tests around replay/export persistence still serializing session chronology correctly
- targeted build verification on the backend solution or Web API project

### Useful architectural checks

- grep-able absence of `HandleInboundMessageAsync` transport parsing in the orchestration authority if that method is removed or relocated
- narrower interfaces showing separate ownership for orchestration, sensing, and observation concerns
- DI registration showing dedicated ingress/orchestration/observation services instead of a single all-purpose manager

## Validation Architecture

### Current test infrastructure

- Framework: xUnit on .NET
- Existing test project: `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ReadingTheReader.Realtime.Persistence.Tests.csproj`
- Existing coverage: intervention runtime and replay/persistence serialization
- Gap: little or no direct orchestration-boundary test coverage

### Recommended validation shape for planning

- Wave 0 or earliest tasks should add orchestration/ingress characterization tests before deep refactors
- each boundary-extraction slice should have at least one automated verification target
- backend build verification should run after major contract moves because DI and interface drift are likely failure points

## Concrete Planning Implications

The plan should not be organized around pages or UI surfaces. It should be organized around architectural seams.

Planning should bias toward:

- additive interfaces and collaborators first
- shrinking the orchestration contract deliberately
- preserving replay/export and setup invariants
- isolating transport concerns before broader plugin-facing abstractions

Planning should avoid:

- trying to solve decision-strategy plugins in this phase
- introducing frontend-heavy UI work under a Phase 1 UI gate
- rewriting Tobii integration and orchestration simultaneously without tests

## Recommended Planning Posture

- Treat this as a backend/core-architecture phase, not a frontend design phase.
- Prefer 3-5 plans with explicit waves rather than one huge “refactor runtime” plan.
- Ensure every plan names the exact files/contracts it touches so two developers can work with minimal overlap.

---

*Research completed for Phase 01*
