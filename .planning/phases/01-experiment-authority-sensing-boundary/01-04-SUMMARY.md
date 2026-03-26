---
phase: 01-experiment-authority-sensing-boundary
plan: "04"
subsystem: infra
tags: [sensing, tobii, calibration, adapter]
requires:
  - phase: 01-experiment-authority-sensing-boundary
    provides: focused authority and observation seams
provides:
  - Application-facing sensing seam
  - Device and calibration services that depend on sensing operations instead of raw adapter usage
  - Clear separation between hardware work, observation, and runtime authority
affects: [04-device-setup-calibration-workflow, 06-researcher-live-mirror-session-operations, future-device-support]
tech-stack:
  added: []
  patterns: [application-facing-sensing-seam, infrastructure-adapter-isolation]
key-files:
  created:
    - Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ISensingOperations.cs
    - Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/SensingOperations.cs
  modified:
    - Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/EyeTrackerService.cs
    - Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/CalibrationService.cs
    - Backend/src/core/ReadingTheReader.core.Application/ApplicationModuleInstaller.cs
key-decisions:
  - "Application services should depend on sensing capabilities rather than direct Tobii adapter semantics."
  - "Calibration and device workflows coordinate canonical state through the runtime authority, not through hardware adapters."
patterns-established:
  - "Sensing work is performed through `ISensingOperations` while Tobii-specific details stay behind infrastructure contracts."
  - "Device and calibration services combine stable sensing capabilities with canonical state updates from the authority."
requirements-completed: [MOD-01, MOD-05]
duration: 1 session
completed: 2026-03-26
---

# Phase 1: Experiment Authority & Sensing Boundary Summary

**Hardware-facing device discovery, licensing, calibration, validation, and stream control now sit behind an application-facing sensing seam instead of leaking Tobii adapter details into broader runtime services.**

## Performance

- **Duration:** 1 session
- **Started:** 2026-03-26
- **Completed:** 2026-03-26
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Added `ISensingOperations` and `SensingOperations` as the stable application-facing sensing contract.
- Rewired eye-tracker and calibration services to depend on sensing operations plus runtime authority.
- Preserved Tobii-specific integration behind infrastructure contracts.

## Task Commits

No task commits were created. Execution was intentionally left uncommitted for manual review at the user's request.

## Files Created/Modified
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ISensingOperations.cs` - Device-agnostic sensing capability contract.
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/SensingOperations.cs` - Adapter-backed sensing implementation for discovery, licensing, calibration, validation, and stream control.
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/EyeTrackerService.cs` - Device service now coordinates through sensing operations and runtime authority.
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/CalibrationService.cs` - Calibration workflow now relies on sensing operations rather than direct adapter usage.

## Decisions Made

- Treat sensing as an application seam distinct from both reader observation and orchestration authority.

## Deviations from Plan

No scope deviations. Validation execution was performed manually by the user instead of by the agent, per request.

## Issues Encountered

- Nullable analysis in `CalibrationService` required an explicit null-forgiving use on the guarded validation snapshot path during build validation.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Device-facing work now has a stable seam that future hardware changes can target.
- Setup/calibration and later live-session work can evolve without reintroducing direct adapter leakage into unrelated modules.

---
*Phase: 01-experiment-authority-sensing-boundary*
*Completed: 2026-03-26*
