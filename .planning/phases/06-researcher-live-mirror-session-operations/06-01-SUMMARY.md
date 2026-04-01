---
phase: 06-researcher-live-mirror-session-operations
plan: "01"
subsystem: api
tags: [live-monitoring, session-authority, transport-contracts, testing]
provides:
  - "Explicit live-monitoring semantics in the authoritative experiment-session contract"
  - "Wave 0 backend tests for start/finish monitorability and participant-view connection state"
affects: [06-02, 06-03, 06-04, researcher-live, replay]
tech-stack:
  added: []
  patterns: [backend-owned monitoring contract, additive snapshot enrichment, authority-first validation]
key-files:
  created:
    - .planning/phases/06-researcher-live-mirror-session-operations/06-01-SUMMARY.md
  modified:
    - Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionSnapshot.cs
    - Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionManager.cs
    - Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ExperimentSessionAuthorityTests.cs
    - Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ExperimentSetupWorkflowTests.cs
    - Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ExperimentReplayExportSerializerTests.cs
    - Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/FileExperimentReplayExportStoreAdapterTests.cs
    - Frontend/src/lib/experiment-session.ts
    - Frontend/src/lib/gaze-socket.ts
    - Frontend/src/lib/experiment-replay.ts
requirements-completed: [LIVE-02, LIVE-05]
completed: 2026-03-31
---

# Phase 6 Plan 01: Live Monitoring Contract Summary

## Accomplishments

- Added `liveMonitoring` to the authoritative experiment-session contract so researcher surfaces can rely on explicit session-operation and monitorability semantics.
- Projected backend-owned fields for start/finish availability, participant-view connection, viewport readiness, and focus-signal freshness.
- Added Wave 0 tests for ready-to-start monitoring, active-session monitorability, disconnect handling, and replay fixture compatibility.

## Verification

- `dotnet test Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ReadingTheReader.Realtime.Persistence.Tests.csproj --no-restore --filter "FullyQualifiedName~ExperimentSessionAuthorityTests|FullyQualifiedName~ExperimentSetupWorkflowTests"`
- `dotnet build Backend/reading-the-reader-backend.sln -v minimal`

## Notes

- No commits were created because the workspace is intentionally left uncommitted.
