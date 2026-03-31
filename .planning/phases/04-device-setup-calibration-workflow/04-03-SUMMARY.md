---
phase: 04-device-setup-calibration-workflow
plan: "03"
subsystem: frontend
tags: [experiment-workflow, setup-readiness, calibration-summary, researcher-ux]
requires:
  - phase: 04-01
    provides: "Nested backend-owned setup readiness and blocker projections"
  - phase: 04-02
    provides: "Frontend mirrors for authoritative setup and calibration contracts"
provides:
  - "One guided experiment workflow that renders backend-backed step readiness, blockers, and calibration quality inline"
  - "A save-then-start reading-material flow so backend start gating and visible UI status stay aligned"
  - "Authoritative eyetracker and calibration step summaries inside the experiment page"
affects: [04-04, experiment-page, calibration-route-return, session-start-gating]
tech-stack:
  added: []
  patterns: [authoritative workflow rendering, explicit save-before-start gating, backend-first blocker messaging]
key-files:
  created:
    - .planning/phases/04-device-setup-calibration-workflow/04-03-SUMMARY.md
    - .planning/phases/04-device-setup-calibration-workflow/deferred-items.md
  modified:
    - Frontend/src/modules/pages/experiment/components/experiment-stepper.tsx
    - Frontend/src/modules/pages/experiment/components/eyetracker-setup.tsx
    - Frontend/src/modules/pages/experiment/components/calibration-step.tsx
    - Frontend/src/modules/pages/experiment/components/utils.ts
    - Frontend/src/redux/slices/experiment-slice.ts
    - Frontend/src/redux/api/participant-api.ts
    - .planning/phases/04-device-setup-calibration-workflow/04-VALIDATION.md
    - .planning/STATE.md
    - .planning/ROADMAP.md
    - .planning/REQUIREMENTS.md
key-decisions:
  - "Use backend setup snapshots for visible step completion and blocker messaging, while keeping local drafts only for form-entry and submit affordances."
  - "Require the reading-material step to save the current draft into the authoritative session before enabling Start, instead of silently persisting during start."
patterns-established:
  - "Guided researcher setup screens can show authoritative step summaries next to local draft state without letting local flags redefine readiness."
  - "Calibration completion in Redux hydration must follow the backend setup snapshot instead of preserving local completion overrides."
requirements-completed: [SETUP-05, SETUP-06]
duration: "~16m"
completed: 2026-03-31
---

# Phase 4 Plan 03: Guided Experiment Workflow Summary

**Authoritative step readiness, blocker messaging, and save-before-start orchestration inside one researcher-operated experiment workflow**

## Performance

- **Duration:** ~16 min
- **Started:** 2026-03-31T10:44:41Z
- **Completed:** 2026-03-31T11:00:10Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- Reworked the experiment stepper so navigation status, current blocker messaging, and start availability read from the authoritative `setup` snapshot instead of scattered local heuristics.
- Added a save-before-start last step so reading material must be persisted into the backend session before the researcher can start a run.
- Updated the eyetracker and calibration cards to show backend-backed readiness, licence state, calibration quality, and explicit next actions without pretending that local draft state alone is enough.
- Removed the local calibration-complete carry-forward during experiment-session hydration so Redux no longer overrides backend truth after route returns or failures.

## Task Commits

No commits were created because the user explicitly required an uncommitted workspace execution for this run.

## Files Created/Modified

- `Frontend/src/modules/pages/experiment/components/experiment-stepper.tsx` - Derives step summaries and start gating from authoritative setup state, shows blockers inline, and adds explicit reading-session save before start.
- `Frontend/src/modules/pages/experiment/components/eyetracker-setup.tsx` - Shows authoritative tracker/licence readiness and warns when local changes are not yet applied.
- `Frontend/src/modules/pages/experiment/components/calibration-step.tsx` - Surfaces authoritative validation quality and blocker state while preserving the dedicated calibration route.
- `Frontend/src/modules/pages/experiment/components/utils.ts` - Centralizes empty setup defaults plus shared workflow-step and calibration-format helpers.
- `Frontend/src/redux/slices/experiment-slice.ts` - Stops preserving local calibration readiness over the backend snapshot during hydration.
- `Frontend/src/redux/api/participant-api.ts` - Invalidates the experiment query after participant save so the guided workflow refreshes from backend authority.
- `.planning/phases/04-device-setup-calibration-workflow/04-VALIDATION.md` - Corrects the frontend build command shape and marks the 04-03 frontend verification rows green.
- `.planning/phases/04-device-setup-calibration-workflow/deferred-items.md` - Records unrelated pre-existing lint failures discovered during verification.
- `.planning/STATE.md` - Advances the local execution position to 04-04 and records the workflow refactor outcome.
- `.planning/ROADMAP.md` - Marks 04-03 complete and advances Phase 4 progress to 3/4.
- `.planning/REQUIREMENTS.md` - Marks SETUP-05 and SETUP-06 validated by the guided workflow changes.

## Decisions Made

- The last step now separates “save the reading setup” from “start the session” so the backend start gate and the visible UI always refer to the same reading-material state.
- The experiment page keeps local draft affordances only for enabling submission actions such as Next, but step completion and blocker copy come from authoritative setup snapshots.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] Participant saves did not refresh the authoritative workflow query**
- **Found during:** Task 1
- **Issue:** Saving participant information did not invalidate the `Experiment` query, so the guided workflow could stay stale even after a successful backend save.
- **Fix:** Added `invalidatesTags: ["Experiment"]` to `participant-api.ts`.
- **Files modified:** `Frontend/src/redux/api/participant-api.ts`
- **Commit:** None - user requested no commits

### Execution Constraint

- The default GSD per-task commit flow was intentionally skipped because the user explicitly requested that no git commits be created.

## Issues Encountered

- The plan’s Bun verification command used the wrong flag order for this workspace. Verification was rerun successfully from the `Frontend/` working directory with `bun run build`.
- `bun run lint` still fails because of unrelated pre-existing `@next/next/no-assign-module-variable` errors in the researcher live view files listed in `deferred-items.md`.

## User Setup Required

None.

## Next Phase Readiness

- 04-04 can now focus on calibration-route interruption and return handling because the main experiment page already treats setup as one coherent authoritative workflow.
- Start gating, blocker messaging, and calibration quality summaries now exist in one place, so route-return work can plug back into an already aligned operator shell.

## Known Stubs

None.

## Self-Check: PASSED

- Verify `.planning/phases/04-device-setup-calibration-workflow/04-03-SUMMARY.md` exists.
- Verify `Frontend/src/modules/pages/experiment/components/experiment-stepper.tsx` exists.
- Verify `Frontend/src/modules/pages/experiment/components/eyetracker-setup.tsx` exists.
- Verify `Frontend/src/modules/pages/experiment/components/calibration-step.tsx` exists.
- Verify `bun run build` passed in `Frontend/`.

---
*Phase: 04-device-setup-calibration-workflow*
*Completed: 2026-03-31*
