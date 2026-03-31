---
phase: 04-device-setup-calibration-workflow
plan: "04"
subsystem: ui
tags: [calibration-route, setup-workflow, validation, researcher-ux, regression-tests]
requires:
  - phase: 04-01
    provides: "Authoritative setup readiness and blocker projections"
  - phase: 04-02
    provides: "Aligned calibration and setup contracts across backend and frontend"
  - phase: 04-03
    provides: "One guided experiment workflow driven by authoritative readiness"
provides:
  - "Calibration-route interruption and return states that preserve explicit outcome messaging back in the experiment workflow"
  - "Dedicated calibration projection tests plus final setup workflow regressions for ready and blocked start paths"
  - "Phase-close validation records tying real commands to the final setup workflow state"
affects: [phase-05, experiment-workflow, calibration-route, session-start-gating]
tech-stack:
  added: []
  patterns: [workflow-return-state, backend-projection-regressions, validation-artifact-closeout]
key-files:
  created:
    - Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/CalibrationWorkflowProjectionTests.cs
    - .planning/phases/04-device-setup-calibration-workflow/04-04-SUMMARY.md
  modified:
    - Frontend/src/modules/pages/calibration/index.tsx
    - Frontend/src/modules/pages/calibration/components/CalibrationReadyHero.tsx
    - Frontend/src/modules/pages/calibration/components/CalibrationReviewPanel.tsx
    - Frontend/src/modules/pages/calibration/components/CalibrationFailurePanel.tsx
    - Frontend/src/modules/pages/calibration/components/CalibrationStatusChrome.tsx
    - Frontend/src/modules/pages/experiment/components/calibration-step.tsx
    - Frontend/src/redux/slices/experiment-slice.ts
    - Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ExperimentSetupWorkflowTests.cs
    - .planning/phases/04-device-setup-calibration-workflow/04-VALIDATION.md
    - .planning/STATE.md
    - .planning/ROADMAP.md
    - .planning/REQUIREMENTS.md
key-decisions:
  - "Persist explicit last-attempt calibration outcomes in Redux so the experiment workflow can explain interruptions and failed validation after returning from the dedicated route."
  - "Close the lingering phase validation gap with a dedicated calibration projection test file instead of relying only on broader setup workflow tests."
patterns-established:
  - "Dedicated researcher subflows should return explicit outcome state to the authoritative setup workflow instead of collapsing failures into generic pending status."
  - "Phase-close validation artifacts should record the real commands and remaining manual-only checks needed on hardware-backed operator walkthroughs."
requirements-completed: [SETUP-03, SETUP-04, SETUP-05, SETUP-06]
duration: "~12m"
completed: 2026-03-31
---

# Phase 4 Plan 04: Calibration Route Reliability Summary

**Calibration-route interruption handling, explicit return-to-workflow outcomes, and final setup readiness regressions for the Tobii-guided setup flow**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-03-31T11:01:20Z
- **Completed:** 2026-03-31T11:13:06Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments

- Hardened the dedicated calibration route so fullscreen loss, hidden-tab interruptions, researcher back-outs, failed validation, and successful review all write explicit status back into the experiment workflow.
- Updated the calibration review and failure surfaces to speak in setup-workflow terms, making the next action clear before the researcher returns to the experiment page.
- Added final workflow regressions for fully ready setup, blocked start on poor validation, and dedicated calibration projection coverage, then recorded the real green verification commands in `04-VALIDATION.md`.

## Task Commits

No commits were created because the user explicitly required an uncommitted workspace execution for this run.

## Files Created/Modified

- `Frontend/src/modules/pages/calibration/index.tsx` - Persists explicit interruption, failure, and success outcomes back into Redux and controls the return-to-experiment path.
- `Frontend/src/modules/pages/calibration/components/CalibrationReadyHero.tsx` - Frames calibration as step 3 of the guided setup workflow and warns about interruption conditions.
- `Frontend/src/modules/pages/calibration/components/CalibrationReviewPanel.tsx` - Adds workflow-oriented next-step messaging and a clear return action for passed and failed review states.
- `Frontend/src/modules/pages/calibration/components/CalibrationFailurePanel.tsx` - Explains that returning to the experiment page leaves calibration blocked until validation passes.
- `Frontend/src/modules/pages/calibration/components/CalibrationStatusChrome.tsx` - Replaces the passive back link with an explicit return-to-setup action.
- `Frontend/src/modules/pages/experiment/components/calibration-step.tsx` - Shows the precise last-attempt calibration outcome instead of falling back to generic blocker copy after route return.
- `Frontend/src/redux/slices/experiment-slice.ts` - Treats failed validation results as failed hydration state instead of generic pending.
- `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ExperimentSetupWorkflowTests.cs` - Adds ready-workflow and blocked-start regressions for the final setup story.
- `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/CalibrationWorkflowProjectionTests.cs` - Pins calibration quality summary and block-reason projection directly.
- `.planning/phases/04-device-setup-calibration-workflow/04-VALIDATION.md` - Marks 04-04 green, closes Wave 0, and records the actual verification commands and remaining manual-only checks.
- `.planning/STATE.md` - Advances local planning state past Phase 4 and records the calibration-route closeout decisions.
- `.planning/ROADMAP.md` - Marks Phase 4 complete.
- `.planning/REQUIREMENTS.md` - Updates setup-requirement traceability to the final 04-04 verification pass.

## Decisions Made

- The calibration route now owns explicit attempt outcome copy, but the experiment workflow remains the place where readiness is judged and where the researcher sees the persisted blocker after return.
- Validation coverage now includes both broad setup workflow tests and a dedicated calibration projection file so the phase can close with its own validation contract satisfied.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Failed validation hydrated back into the experiment page as generic pending state**
- **Found during:** Task 1
- **Issue:** Returning from a completed-but-failed validation run could collapse the experiment workflow back to a vague pending state, hiding what actually failed.
- **Fix:** Updated calibration hydration to treat explicit failed validation results as failed state and surfaced the last calibration outcome in the experiment calibration step.
- **Files modified:** `Frontend/src/redux/slices/experiment-slice.ts`, `Frontend/src/modules/pages/experiment/components/calibration-step.tsx`, `Frontend/src/modules/pages/calibration/index.tsx`
- **Verification:** `bun run build` in `Frontend/`
- **Commit:** None - user requested no commits

**2. [Rule 2 - Missing Critical Functionality] Closed the unfinished phase validation gap for calibration projection coverage**
- **Found during:** Task 2
- **Issue:** `04-VALIDATION.md` still marked Wave 0 incomplete because there was no dedicated calibration projection regression file.
- **Fix:** Added `CalibrationWorkflowProjectionTests.cs` and updated validation tracking so the phase closes with its own declared coverage in place.
- **Files modified:** `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/CalibrationWorkflowProjectionTests.cs`, `.planning/phases/04-device-setup-calibration-workflow/04-VALIDATION.md`
- **Verification:** `dotnet test Backend/reading-the-reader-backend.sln -v minimal`
- **Commit:** None - user requested no commits

### Execution Constraint

- The default GSD per-task commit flow was intentionally skipped because the user explicitly requested that no git commits be created.

## Issues Encountered

None.

## User Setup Required

None.

## Next Phase Readiness

- Phase 4 now closes with a coherent researcher-operated setup story from eyetracker selection through calibration review and start gating.
- Manual-only verification still remains for real fullscreen interruption behavior and operator clarity on a Tobii-connected browser session, but the automated coverage and planning artifacts are aligned for phase handoff.

## Known Stubs

None.

## Self-Check: PASSED

- Verified `.planning/phases/04-device-setup-calibration-workflow/04-04-SUMMARY.md` exists.
- Verified `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/CalibrationWorkflowProjectionTests.cs` exists.
- Verified `Frontend/src/modules/pages/calibration/index.tsx` exists.
- Verified `dotnet test Backend/reading-the-reader-backend.sln -v minimal` passed.
- Verified `bun run build` passed in `Frontend/`.

---
*Phase: 04-device-setup-calibration-workflow*
*Completed: 2026-03-31*
