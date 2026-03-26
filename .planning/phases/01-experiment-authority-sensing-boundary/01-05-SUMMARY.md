---
phase: 01-experiment-authority-sensing-boundary
plan: "05"
subsystem: api
tags: [rest, queries, dependency-injection, authority]
requires:
  - phase: 01-experiment-authority-sensing-boundary
    provides: ingress, observation, and sensing seams
provides:
  - Focused session query contract
  - REST endpoints wired to authority and query seams instead of the broad manager
  - Contributor-visible DI registrations for all Phase 1 boundaries
affects: [02-swappable-decision-strategies, 06-researcher-live-mirror-session-operations, replay-and-export]
tech-stack:
  added: []
  patterns: [focused-query-surface, thin-transport-endpoints]
key-files:
  created:
    - Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/IExperimentSessionQueryService.cs
  modified:
    - Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/IExperimentSessionManager.cs
    - Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionManager.cs
    - Backend/src/core/ReadingTheReader.core.Application/ApplicationModuleInstaller.cs
    - Backend/src/ReadingTheReader.WebApi/ExperimentSessionEndpoints/GetExperimentSessionEndpoint.cs
    - Backend/src/ReadingTheReader.WebApi/ExperimentSessionEndpoints/UpsertReadingSessionEndpoint.cs
    - Backend/src/ReadingTheReader.WebApi/ExperimentSessionEndpoints/FinishExperimentEndpoint.cs
    - Backend/src/ReadingTheReader.WebApi/ExperimentSessionEndpoints/CreateSavedExperimentReplayExportEndpoint.cs
    - Backend/src/ReadingTheReader.WebApi/ExperimentSessionEndpoints/GetSavedExperimentReplayExportsEndpoint.cs
    - Backend/src/ReadingTheReader.WebApi/ExperimentSessionEndpoints/GetSavedExperimentReplayExportByIdEndpoint.cs
    - Backend/src/ReadingTheReader.WebApi/ExperimentSessionEndpoints/DownloadExperimentExportEndpoint.cs
    - Backend/src/infrastructure/ReadingTheReader.Realtime.Persistence/ExperimentStateCheckpointWorker.cs
key-decisions:
  - "Transport surfaces should depend on focused authority and query interfaces only."
  - "The broad session manager should be reduced to the small remaining orchestration role instead of serving as the public API surface."
patterns-established:
  - "REST writes target runtime authority while reads target a dedicated query service."
  - "DI explicitly registers authority, ingress, observation, sensing, and query seams."
requirements-completed: [MOD-01, MOD-05]
duration: 1 session
completed: 2026-03-26
---

# Phase 1: Experiment Authority & Sensing Boundary Summary

**Experiment-session REST endpoints now read through a focused query surface and write through the runtime authority, making the Phase 1 seams visible across DI and transport code instead of hiding behind one oversized manager contract.**

## Performance

- **Duration:** 1 session
- **Started:** 2026-03-26
- **Completed:** 2026-03-26
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Added `IExperimentSessionQueryService` for current snapshot and replay/export reads.
- Removed direct Web API dependencies on `IExperimentSessionManager`.
- Finished DI cleanup so authority, ingress, sensing, observation, and query seams are all explicit.

## Task Commits

No task commits were created. Execution was intentionally left uncommitted for manual review at the user's request.

## Files Created/Modified
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/IExperimentSessionQueryService.cs` - Focused read-side contract for snapshots and replay exports.
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationModuleInstaller.cs` - Registers the full Phase 1 seam set in DI.
- `Backend/src/ReadingTheReader.WebApi/ExperimentSessionEndpoints/GetExperimentSessionEndpoint.cs` - Query endpoint now depends on the focused session query surface.
- `Backend/src/ReadingTheReader.WebApi/ExperimentSessionEndpoints/UpsertReadingSessionEndpoint.cs` - Write endpoint now coordinates through runtime authority and query service.
- `Backend/src/infrastructure/ReadingTheReader.Realtime.Persistence/ExperimentStateCheckpointWorker.cs` - Background persistence now reads through the focused query seam.

## Decisions Made

- Keep endpoint logic thin and transport-only by routing reads and writes through separate focused interfaces.

## Deviations from Plan

No scope deviations. Validation execution was performed manually by the user instead of by the agent, per request.

## Issues Encountered

None beyond the build fixes already covered in earlier plan summaries.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The backend now exposes a clear authority/query split that Phase 2 decision-strategy work can build on.
- Both REST and WebSocket entrypoints converge on the same backend-owned session truth without transport-specific leakage.

---
*Phase: 01-experiment-authority-sensing-boundary*
*Completed: 2026-03-26*
