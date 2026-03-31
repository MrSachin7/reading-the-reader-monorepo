---
phase: 04-device-setup-calibration-workflow
plan: "01"
subsystem: api
tags: [realtime, calibration, eyetracker, session-authority, testing]
requires:
  - phase: 03-pluggable-intervention-modules
    provides: "Backend experiment authority, replay/export persistence, and stable realtime session seams"
provides:
  - "Nested backend-owned setup readiness snapshots for eye tracker, participant, calibration, and reading material"
  - "One authoritative setup blocker reason reused by session-start validation"
  - "Wave 0 backend tests for setup projection and start-gate alignment"
affects: [04-02, 04-03, experiment-workflow-ui, transport-contracts]
tech-stack:
  added: []
  patterns: [backend-owned setup readiness projection, shared blocker reason for UI and start gate]
key-files:
  created:
    - Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ExperimentSetupWorkflowTests.cs
  modified:
    - Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionSnapshot.cs
    - Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionManager.cs
    - Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ExperimentSessionAuthorityTests.cs
    - Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ExperimentReplayExportSerializerTests.cs
    - Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/FileExperimentReplayExportStoreAdapterTests.cs
    - .planning/phases/04-device-setup-calibration-workflow/04-VALIDATION.md
    - .planning/ROADMAP.md
    - .planning/STATE.md
key-decisions:
  - "Represent setup readiness as nested transport-safe step snapshots instead of flat completion booleans."
  - "Reuse the projected current blocker reason inside StartSessionAsync so frontend guidance and backend rejection cannot drift."
patterns-established:
  - "Authoritative workflow state should expose both per-step readiness details and the single current blocker."
  - "Backend authority tests should assert the same rejection strings the workflow snapshot projects."
requirements-completed: [SETUP-02, SETUP-05, SETUP-06]
duration: "~20m"
completed: 2026-03-31
---

# Phase 4 Plan 01: Authoritative Setup Readiness Summary

**Nested backend setup-readiness snapshots with explicit device/licence, calibration-quality, and reading-material blockers reused by the session start gate**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-03-31T10:10:00Z
- **Completed:** 2026-03-31T10:29:39Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Replaced the coarse setup booleans with nested readiness snapshots for eye tracker, participant, calibration, and reading material.
- Centralized session-start blocking on the same projected setup blocker reason that downstream workflow UI will read.
- Added Wave 0 backend coverage for setup projection and updated authority tests to pin the exact rejection sequence.

## Task Commits

No commits were created because the user explicitly required an uncommitted workspace execution for this run.

## Files Created/Modified

- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionSnapshot.cs` - Added transport-safe nested readiness and blocker records.
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionManager.cs` - Projects the richer setup snapshot and reuses it for start gating.
- `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ExperimentSetupWorkflowTests.cs` - New Wave 0 readiness and blocker projection coverage.
- `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ExperimentSessionAuthorityTests.cs` - Start-gate assertions now match projected blocker reasons.
- `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ExperimentReplayExportSerializerTests.cs` - Updated fixture construction for the richer setup contract.
- `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/FileExperimentReplayExportStoreAdapterTests.cs` - Updated fixture construction for the richer setup contract.
- `.planning/phases/04-device-setup-calibration-workflow/04-VALIDATION.md` - Marked 04-01 validation tasks green.
- `.planning/ROADMAP.md` - Marked 04-01 complete and advanced Phase 4 progress to 1/4.
- `.planning/STATE.md` - Advanced execution state to 04-02.

## Decisions Made

- Used one `CurrentBlocker` record plus nested step snapshots instead of a flat list of booleans so future UI work can show both summary and detail from backend truth.
- Kept licence persistence state separate from active selection state by exposing both `HasAppliedLicence` and `HasSavedLicence`.

## Deviations from Plan

### Execution Constraint

- The default GSD per-task commit flow was intentionally skipped because the user explicitly requested that no git commits be created.

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated replay-export test fixtures to the richer setup contract**
- **Found during:** Task 2
- **Issue:** Existing replay/export tests instantiated the old `ExperimentSetupSnapshot` constructor and would no longer compile.
- **Fix:** Replaced the old fixture shape with fully populated nested readiness snapshots.
- **Files modified:** `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ExperimentReplayExportSerializerTests.cs`, `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/FileExperimentReplayExportStoreAdapterTests.cs`
- **Verification:** `dotnet test Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ReadingTheReader.Realtime.Persistence.Tests.csproj --no-restore`

---

**Total deviations:** 1 auto-fixed, plus 1 user-imposed execution constraint
**Impact on plan:** No scope creep. The only extra code changes were required to keep existing tests compiling against the new authoritative setup contract.

## Issues Encountered

- Parallel targeted `dotnet test` runs produced one transient `MSB3101` cache-file warning in the build output. The rerun and full project test pass were green, so no code change was required.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 04-02 can now align REST/frontend contract mirrors to a stable backend-owned setup readiness shape.
- The frontend still needs transport alignment before it can consume the new nested setup model directly.

## Known Stubs

None.

## Self-Check: PASSED

- Verified summary target file exists.
- Verified `ExperimentSetupWorkflowTests`, `ExperimentSessionAuthorityTests`, and the full persistence test project all passed.
- Execution intentionally remains uncommitted per user request.

---
*Phase: 04-device-setup-calibration-workflow*
*Completed: 2026-03-31*
