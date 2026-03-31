# Phase 4: Device Setup & Calibration Workflow - Research

**Date:** 2026-03-31
**Phase:** 04 - Device Setup & Calibration Workflow

## Planning Question

What implementation slices will turn the existing device selection, licence upload, calibration route, validation metrics, and experiment start checks into one reliable Tobii-ready workflow that researchers can complete entirely inside the platform?

## Current Runtime Assessment

### What already works

- [`Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/SensingOperations.cs`](Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/SensingOperations.cs) already encapsulates connected-device discovery, saved-licence lookup, tracker selection, and the hardware calibration/validation operations.
- [`Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/CalibrationService.cs`](Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/CalibrationService.cs) already owns the calibration and validation lifecycle, including pass/fail quality output and interruption handling.
- [`Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionManager.cs`](Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionManager.cs) already blocks session start until eye tracker, participant, calibration, and reading material are ready.
- [`Frontend/src/modules/pages/experiment/components/eyetracker-setup.tsx`](Frontend/src/modules/pages/experiment/components/eyetracker-setup.tsx) already gives the researcher an in-app device and licence step.
- [`Frontend/src/modules/pages/calibration/index.tsx`](Frontend/src/modules/pages/calibration/index.tsx) already provides a dedicated, full-screen hardware calibration route that fits the Tobii target choreography.
- [`Frontend/src/modules/pages/experiment/components/experiment-stepper.tsx`](Frontend/src/modules/pages/experiment/components/experiment-stepper.tsx) already acts as the shell for a guided setup flow.

### Where the workflow is still fragmented

1. Setup truth is split between backend readiness and frontend draft heuristics.
   The backend already knows whether start is allowed, but the experiment flow still computes much of its visible completion state from local Redux flags and route return behavior.

2. The eye-tracker step is not fully authoritative.
   Device discovery and selection exist, but the frontend mutation receives no authoritative response payload, which makes “selection complete” primarily a local state story.

3. Calibration is technically integrated but experientially detached.
   The experiment flow sends the researcher to `/calibration`, yet the main setup page does not fully project the rich calibration status, validation quality, and blocking reasons that the backend already computes.

4. The setup snapshot is too coarse for a guided operator flow.
   `ExperimentSetupSnapshot` exposes booleans and a current index, but it does not explain whether the blocker is “no device selected,” “device not licensed,” “validation failed,” or “reading material missing.”

5. Automated coverage is thin around the combined setup workflow.
   There is backend authority coverage, but no focused test suite pins the Phase 4 start-gate story end to end.

## Recommended Target Architecture

### 1. Make setup readiness a first-class backend projection

The backend should project a richer setup workflow model that explains:

- which setup steps are complete
- which step is currently blocking start
- why it is blocked
- the latest calibration quality summary
- whether the selected tracker has a usable licence state

That model should be part of the canonical session/query surface so the experiment page mirrors backend truth instead of inventing its own.

### 2. Keep calibration as a dedicated route, but wire it into one workflow

The full-screen calibration route is already the right environment for the gaze target sequence. Phase 4 should preserve it, but the experiment page must treat it as one guided step with:

- launch state
- in-progress state
- pass/fail summary
- clear return path

### 3. Tighten contract alignment around device and calibration state

The frontend should receive authoritative feedback when a tracker is selected and when calibration state changes. Local step-draft state can still exist, but it should follow backend snapshots rather than define readiness itself.

### 4. Surface blocking reasons before the Start button is pressed

The thesis workflow is stronger if the researcher can see the same reasons the backend would use to reject start. The UI should show those reasons inline in the guided setup flow instead of only relying on a late error after pressing Start.

### 5. Add focused workflow tests before broad UI polish

Wave 0 for this phase should pin:

- start-gate readiness rules
- device/licence setup projection
- calibration pass/fail projection

That gives the later UI refactor a stable backend contract to target.

## Recommended Plan Slices

### Slice A: Backend setup-readiness contracts and start-gate projection

Purpose:

- enrich the authoritative setup model
- explain blockers, not only booleans
- pin start-gate behavior with tests

Likely file areas:

- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionSnapshot.cs`
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionManager.cs`
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/SensingOperations.cs`
- `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ExperimentSetupWorkflowTests.cs`
- `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ExperimentSessionAuthorityTests.cs`

Expected outcome:

- the backend exposes a richer, trustworthy setup workflow contract that downstream UI can consume directly

### Slice B: Device-selection and calibration transport/contract alignment

Purpose:

- make device and calibration transport surfaces return authoritative workflow information
- align frontend contract mirrors with richer setup/calibration state

Likely file areas:

- `Backend/src/ReadingTheReader.WebApi/EyeTrackerEndpoints/*.cs`
- `Backend/src/ReadingTheReader.WebApi/CalibrationEndpoints/*.cs`
- `Frontend/src/redux/api/eyetracker-api.ts`
- `Frontend/src/redux/api/experiment-session-api.ts`
- `Frontend/src/lib/experiment-session.ts`
- `Frontend/src/lib/calibration.ts`

Expected outcome:

- the experiment flow can react to authoritative setup and calibration status without relying on route-local assumptions

### Slice C: Guided experiment workflow refactor

Purpose:

- turn the experiment page into one coherent setup path
- surface step-level readiness, blockers, and calibration quality
- keep device, participant, calibration, reading material, and start controls in one operator story

Likely file areas:

- `Frontend/src/modules/pages/experiment/components/experiment-stepper.tsx`
- `Frontend/src/modules/pages/experiment/components/eyetracker-setup.tsx`
- `Frontend/src/modules/pages/experiment/components/calibration-step.tsx`
- `Frontend/src/redux/slices/experiment-slice.ts`
- `Frontend/src/modules/pages/experiment/components/utils.ts`

Expected outcome:

- the researcher can stay in one guided workflow and understand what still blocks session start

### Slice D: Calibration route hardening and end-to-end verification

Purpose:

- keep the calibration route reliable under interruption and return-to-flow cases
- reflect pass/fail outcomes clearly back into the experiment workflow
- verify the end-to-end Tobii-ready setup story

Likely file areas:

- `Frontend/src/modules/pages/calibration/index.tsx`
- `Frontend/src/modules/pages/calibration/components/*.tsx`
- `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ExperimentSetupWorkflowTests.cs`
- `.planning/phases/04-device-setup-calibration-workflow/04-VALIDATION.md`

Expected outcome:

- calibration can be launched, completed, cancelled, or failed without leaving the researcher confused about next steps or session readiness

## UI Planning Posture

This is a workflow phase, not a visual redesign phase. The experiment stepper and calibration route should keep the repo’s existing card-based researcher language. The key change is coherence: one authoritative setup story, explicit blocking reasons, and a calibration summary that the researcher can trust before starting a session.
