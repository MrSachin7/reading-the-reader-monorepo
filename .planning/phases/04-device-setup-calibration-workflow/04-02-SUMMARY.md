---
phase: 04-device-setup-calibration-workflow
plan: "02"
subsystem: api
tags: [realtime, calibration, eyetracker, transport-contracts, frontend-mirrors]
requires:
  - phase: 04-01
    provides: "Backend-owned nested setup readiness snapshots and aligned session-start blockers"
provides:
  - "Authoritative eye-tracker selection responses with selected-device summary plus setup readiness"
  - "Discovery responses that expose saved-licence visibility and active-device state"
  - "Frontend setup and calibration mirrors aligned to the nested backend readiness contracts"
affects: [04-03, experiment-workflow-ui, calibration-route, transport-contracts]
tech-stack:
  added: []
  patterns: [authoritative post-mutation setup responses, nested setup-readiness frontend mirrors]
key-files:
  created:
    - .planning/phases/04-device-setup-calibration-workflow/04-02-SUMMARY.md
  modified:
    - Backend/src/ReadingTheReader.WebApi/EyeTrackerEndpoints/GetConnectedEyetrackersEndpoint.cs
    - Backend/src/ReadingTheReader.WebApi/EyeTrackerEndpoints/SelectEyeTrackerEndpoint.cs
    - Frontend/src/lib/calibration.ts
    - Frontend/src/lib/experiment-session.ts
    - Frontend/src/redux/api/eyetracker-api.ts
    - Frontend/src/redux/slices/experiment-slice.ts
    - Frontend/src/modules/pages/experiment/components/eyetracker-setup.tsx
    - Frontend/src/modules/pages/experiment/components/experiment-stepper.tsx
    - .planning/phases/04-device-setup-calibration-workflow/04-VALIDATION.md
    - .planning/ROADMAP.md
    - .planning/STATE.md
    - .planning/REQUIREMENTS.md
key-decisions:
  - "Return selected tracker summary plus setup readiness from the selection endpoint instead of a bare 200 so the workflow can react to backend truth immediately."
  - "Keep calibration transport on CalibrationSessionSnapshot and align frontend mirrors to the backend-owned summary fields instead of inventing a second calibration DTO."
patterns-established:
  - "REST mutations that change setup authority should return the authoritative post-mutation setup projection."
  - "Frontend workflow consumers should read nested setup.eyeTracker/participant/calibration/readingMaterial readiness instead of flat completion booleans."
requirements-completed: [SETUP-01, SETUP-02, SETUP-03, SETUP-04]
duration: "~14m"
completed: 2026-03-31
---

# Phase 4 Plan 02: Transport Contract Alignment Summary

**Authoritative eye-tracker selection responses and frontend setup/calibration mirrors aligned to the nested backend readiness contract**

## Performance

- **Duration:** ~14 min
- **Started:** 2026-03-31T10:31:00Z
- **Completed:** 2026-03-31T10:44:41Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments

- Replaced the bare eye-tracker selection success response with a typed payload that includes the selected tracker and authoritative setup readiness.
- Added selected-device visibility to discovery responses while preserving per-device saved-licence visibility.
- Removed the old flat setup booleans from the frontend mirror and updated existing experiment workflow consumers to read the nested readiness shape from 04-01.

## Task Commits

No commits were created because the user explicitly required an uncommitted workspace execution for this run.

## Files Created/Modified

- `Backend/src/ReadingTheReader.WebApi/EyeTrackerEndpoints/GetConnectedEyetrackersEndpoint.cs` - Returns typed tracker summaries with saved-licence and active-selection state.
- `Backend/src/ReadingTheReader.WebApi/EyeTrackerEndpoints/SelectEyeTrackerEndpoint.cs` - Returns authoritative selected-tracker and setup-readiness payloads after selection.
- `Frontend/src/lib/experiment-session.ts` - Mirrors the nested backend setup readiness and blocker contracts.
- `Frontend/src/lib/calibration.ts` - Extracts reusable calibration-quality and validation-summary types for UI consumers.
- `Frontend/src/redux/api/eyetracker-api.ts` - Maps discovery and selection responses into typed frontend data and invalidates experiment state after selection.
- `Frontend/src/redux/slices/experiment-slice.ts` - Hydrates local workflow draft state from nested setup readiness instead of removed flat booleans.
- `Frontend/src/modules/pages/experiment/components/eyetracker-setup.tsx` - Treats the mutation response as the authoritative completion result for the tracker step.
- `Frontend/src/modules/pages/experiment/components/experiment-stepper.tsx` - Reads step completion from nested setup readiness fields.
- `.planning/phases/04-device-setup-calibration-workflow/04-VALIDATION.md` - Marked 04-02 verification rows green and corrected the frontend build command shape.
- `.planning/ROADMAP.md` - Marked 04-02 complete and advanced Phase 4 plan progress to 2/4.
- `.planning/STATE.md` - Advanced the current execution position to 04-03.
- `.planning/REQUIREMENTS.md` - Marked SETUP-01 through SETUP-04 validated by the current Phase 4 contract work.

## Decisions Made

- Kept the richer calibration summary inside the existing calibration snapshot surface so transport, realtime state, and UI all reference one backend-owned model.
- Invalidated both `Eyetracker` and `Experiment` cache tags after selection so the researcher workflow refreshes from authoritative backend state instead of local assumptions.

## Deviations from Plan

### Execution Constraint

- The default GSD per-task commit flow was intentionally skipped because the user explicitly requested that no git commits be created.

None otherwise - the plan scope was implemented as written.

## Issues Encountered

- The plan’s frontend build command used the wrong Bun invocation shape for this repo. Verification was rerun with `bun --cwd=Frontend run build`.
- Turbopack build output stalled in the sandbox without surfacing a result. A Webpack fallback build showed the real blocker: `next/font` could not resolve Google Fonts from the sandbox.
- The frontend build passed once rerun with escalated network access so Next.js could fetch the configured fonts.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 04-03 can now refactor the guided experiment workflow against authoritative selection responses and the nested setup readiness contract already exposed to the frontend.
- Calibration quality, validation pass/fail, and current setup blocker data are now available to the workflow without adding another transport abstraction.

## Known Stubs

None.

## Self-Check: PASSED

- Verified `.planning/phases/04-device-setup-calibration-workflow/04-02-SUMMARY.md` exists.
- Verified `dotnet build Backend/reading-the-reader-backend.sln -v minimal` passed.
- Verified `bun run lint` for touched frontend files passed.
- Verified `bun x tsc -p tsconfig.json --noEmit` passed.
- Verified `bun x next build --webpack` passed with escalated network access after the sandbox DNS restriction on Google Fonts was removed from the verification path.
- Execution intentionally remains uncommitted per user request.

---
*Phase: 04-device-setup-calibration-workflow*
*Completed: 2026-03-31*
