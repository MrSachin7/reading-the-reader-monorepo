---
phase: 05-controlled-markdown-reading-baseline
plan: "01"
subsystem: api
tags: [reading-baseline, session-authority, transport-contracts, testing]
requires:
  - phase: 04-device-setup-calibration-workflow
    provides: "Authoritative setup gating and the saved reading-session step in the experiment workflow"
provides:
  - "Explicit backend reading-baseline semantics for saved-setup provenance and lock state"
  - "Reading-material readiness projection that exposes configured time and presentation lock details"
  - "Wave 0 backend tests that pin baseline authority before frontend fallback removal"
affects: [05-02, 05-03, participant-reader, experiment-workflow]
tech-stack:
  added: []
  patterns: [backend-owned reading baseline, additive snapshot enrichment, wave-0 authority tests]
key-files:
  created:
    - .planning/phases/05-controlled-markdown-reading-baseline/05-01-SUMMARY.md
  modified:
    - Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/LiveReadingSessionSnapshot.cs
    - Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionSnapshot.cs
    - Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionManager.cs
    - Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ExperimentSetupWorkflowTests.cs
    - Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ExperimentReplayExportSerializerTests.cs
    - Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/FileExperimentReplayExportStoreAdapterTests.cs
key-decisions:
  - "Expose saved-setup provenance and lock semantics as part of the authoritative reading baseline instead of leaving the frontend to infer them from `sourceSetupId` and `editableByResearcher` alone."
  - "Keep the transport additive by enriching existing reading-session/readiness snapshots rather than introducing a second parallel baseline DTO."
patterns-established:
  - "Participant baseline authority should be expressed directly in transport contracts before UI removes local fallbacks."
requirements-completed: [READ-01, READ-04]
duration: "~20m"
completed: 2026-03-31
---

# Phase 5 Plan 01: Backend Reading Baseline Summary

**Backend-owned reading-baseline semantics for saved setup provenance, configured timestamp, and participant lock state**

## Accomplishments

- Added explicit `UsesSavedSetup` and `IsPresentationLocked` semantics to the authoritative reading-session transport surface.
- Enriched reading-material readiness with saved-setup provenance, configured timestamp, and presentation-lock fields so the setup workflow can explain the active baseline more clearly.
- Added Wave 0 backend assertions for locked saved baselines and updated replay/export fixtures to compile against the richer contract.

## Verification

- `dotnet test Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ReadingTheReader.Realtime.Persistence.Tests.csproj --no-restore --filter "FullyQualifiedName~ExperimentSetupWorkflowTests|FullyQualifiedName~ExperimentSessionAuthorityTests|FullyQualifiedName~ReadingSession|FullyQualifiedName~ExperimentReplayExportSerializerTests|FullyQualifiedName~FileExperimentReplayExportStoreAdapterTests"`
- `dotnet build Backend/reading-the-reader-backend.sln -v minimal`

## Notes

- No commits were created because the user explicitly requested an uncommitted workspace execution.

---
*Phase: 05-controlled-markdown-reading-baseline*
*Completed: 2026-03-31*
