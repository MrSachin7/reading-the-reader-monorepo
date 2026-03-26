---
phase: 01-experiment-authority-sensing-boundary
plan: "03"
subsystem: api
tags: [reader-observation, websocket, canonical-state, realtime]
requires:
  - phase: 01-experiment-authority-sensing-boundary
    provides: typed ingress and focused runtime authority
provides:
  - Separate reader-observation boundary
  - Observation routing from realtime ingress into a dedicated backend service
  - Canonical snapshot ownership preserved while participant-side reporting remains transport-facing
affects: [05-controlled-markdown-reading-baseline, 06-researcher-live-mirror-session-operations, 07-context-preserving-adaptive-reading]
tech-stack:
  added: []
  patterns: [reader-observation-boundary, backend-owned-canonical-snapshot]
key-files:
  created:
    - Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/IReaderObservationService.cs
    - Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ReaderObservationService.cs
  modified:
    - Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/IExperimentSessionManager.cs
    - Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionManager.cs
    - Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentCommandIngress.cs
    - Backend/src/core/ReadingTheReader.core.Application/ApplicationModuleInstaller.cs
key-decisions:
  - "Reader observation is its own application seam and not part of hardware sensing."
  - "Frontend socket payload names remain stable because the backend already exposes the needed observation message types."
patterns-established:
  - "Participant viewport, focus, and attention summaries enter through ingress and land in a dedicated observation service."
  - "Canonical experiment truth remains backend-owned even when observations originate in the frontend."
requirements-completed: [MOD-05]
duration: 1 session
completed: 2026-03-26
---

# Phase 1: Experiment Authority & Sensing Boundary Summary

**Participant viewport, reading focus, and attention-summary updates now cross a dedicated reader-observation boundary while the backend remains the canonical owner of the live session snapshot.**

## Performance

- **Duration:** 1 session
- **Started:** 2026-03-26
- **Completed:** 2026-03-26
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Added `IReaderObservationService` and `ReaderObservationService` as a separate seam from sensing.
- Routed participant observation commands through ingress into the new backend observation boundary.
- Narrowed the public manager surface so observation mutations are no longer advertised as part of the broad orchestration contract.

## Task Commits

No task commits were created. Execution was intentionally left uncommitted for manual review at the user's request.

## Files Created/Modified
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/IReaderObservationService.cs` - Explicit contract for participant-view and reading-state observations.
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ReaderObservationService.cs` - Backend-owned observation handler for viewport, focus, and attention updates.
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentCommandIngress.cs` - Observation commands now dispatch into the dedicated boundary.
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/IExperimentSessionManager.cs` - Observation-specific methods removed from the public manager surface.

## Decisions Made

- Keep the frontend websocket client unchanged where possible because the existing observation message names already align with the extracted backend seam.

## Deviations from Plan

- `Frontend/src/lib/gaze-socket.ts` was inspected but did not require code changes because the required observation message names were already in place.
- Validation execution was performed manually by the user instead of by the agent, per request.

## Issues Encountered

None in this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Reader observation is now separable from both sensing and orchestration.
- Later reading-flow and researcher-live work can consume observation-specific contracts without reopening hardware seams.

---
*Phase: 01-experiment-authority-sensing-boundary*
*Completed: 2026-03-26*
