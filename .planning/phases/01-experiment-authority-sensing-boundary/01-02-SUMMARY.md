---
phase: 01-experiment-authority-sensing-boundary
plan: "02"
subsystem: api
tags: [websocket, ingress, authority, realtime]
requires:
  - phase: 01-experiment-authority-sensing-boundary
    provides: guardrail tests for authority and ingress behavior
provides:
  - Typed websocket command ingress
  - Narrow runtime authority contract for canonical session state transitions
  - Removal of transport parsing from the orchestration core
affects: [02-swappable-decision-strategies, websocket-transport, researcher-live-runtime]
tech-stack:
  added: []
  patterns: [typed-command-ingress, focused-authority-contract]
key-files:
  created:
    - Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/IExperimentRuntimeAuthority.cs
    - Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/IExperimentCommandIngress.cs
    - Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/RealtimeIngressCommands.cs
    - Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentCommandIngress.cs
  modified:
    - Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/IExperimentSessionManager.cs
    - Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionManager.cs
    - Backend/src/ReadingTheReader.WebApi/Websockets/WebSocketConfiguration.cs
    - Backend/src/core/ReadingTheReader.core.Application/ApplicationModuleInstaller.cs
key-decisions:
  - "WebSocket transport now parses envelopes only and delegates application intent through typed commands."
  - "Canonical state transitions stay in one runtime authority instead of being spread across transport handlers."
patterns-established:
  - "Transport code stops switching on raw realtime message types inside the runtime manager."
  - "Application intent is expressed as typed ingress commands instead of envelope-shaped JSON."
requirements-completed: [MOD-05]
duration: 1 session
completed: 2026-03-26
---

# Phase 1: Experiment Authority & Sensing Boundary Summary

**WebSocket transport now hands typed application commands to a dedicated ingress service while canonical session state stays behind a focused backend runtime authority.**

## Performance

- **Duration:** 1 session
- **Started:** 2026-03-26
- **Completed:** 2026-03-26
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Added `IExperimentRuntimeAuthority` and `IExperimentCommandIngress` as the first explicit runtime seams.
- Moved websocket command routing into `ExperimentCommandIngress` with typed ingress records.
- Removed raw realtime transport parsing from `ExperimentSessionManager`.

## Task Commits

No task commits were created. Execution was intentionally left uncommitted for manual review at the user's request.

## Files Created/Modified
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/IExperimentRuntimeAuthority.cs` - Focused contract for backend-owned session state transitions.
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/IExperimentCommandIngress.cs` - Application-facing realtime ingress boundary.
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/RealtimeIngressCommands.cs` - Typed command records plus websocket envelope translation.
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentCommandIngress.cs` - Dispatcher that routes commands into authority and downstream seams.
- `Backend/src/ReadingTheReader.WebApi/Websockets/WebSocketConfiguration.cs` - Transport now resolves ingress and forwards typed commands.

## Decisions Made

- Treat websocket transport as a thin envelope parser only; application behavior lives behind ingress and authority contracts.

## Deviations from Plan

No scope deviations. Validation execution was performed manually by the user instead of by the agent, per request.

## Issues Encountered

- Generic inference in the realtime command factory failed during build validation and was fixed by adding explicit `Deserialize<TPayload>` type arguments.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 1 now has a contributor-readable ingress seam that later decision and intervention modules can build against.
- REST cleanup and observation extraction can target focused contracts instead of an oversized transport-aware manager.

---
*Phase: 01-experiment-authority-sensing-boundary*
*Completed: 2026-03-26*
