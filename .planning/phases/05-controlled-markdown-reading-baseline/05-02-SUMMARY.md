---
phase: 05-controlled-markdown-reading-baseline
plan: "02"
subsystem: ui
tags: [reading-material-setup, experiment-workflow, researcher-ux, local-draft-state]
requires:
  - phase: 05-01
    provides: "Authoritative reading-baseline contract and lock semantics"
provides:
  - "Reading-material setup copy and workflow centered on reusable controlled baselines"
  - "Clearer distinction between saved reusable setup and unsaved local draft state"
  - "Experiment setup baseline messaging that treats reading configuration as a session baseline, not a loose draft"
affects: [05-03, participant-reader, setup-workflow]
tech-stack:
  added: []
  patterns: [local-draft-vs-authority, reusable-baseline-language, preview-state-sync]
key-files:
  created:
    - .planning/phases/05-controlled-markdown-reading-baseline/05-02-SUMMARY.md
  modified:
    - Frontend/src/modules/pages/reading-material-setup/index.tsx
    - Frontend/src/modules/pages/reading/lib/useReadingSettings.ts
    - Frontend/src/modules/pages/experiment/components/experiment-stepper.tsx
key-decisions:
  - "Editing a saved setup locally should immediately drop it back to unsaved draft state instead of silently keeping the old saved-setup identity."
  - "The experiment workflow should speak in terms of session baselines so the researcher can tell what the participant route will actually use."
patterns-established:
  - "Reusable saved setups and active session baselines are distinct concepts and should be labeled that way in the UI."
requirements-completed: [READ-02, READ-04]
duration: "~25m"
completed: 2026-03-31
---

# Phase 5 Plan 02: Researcher Baseline Workflow Summary

**Reading-material setup and experiment-stepper updates that separate reusable saved baselines from local draft state**

## Accomplishments

- Reframed the reading-material setup page around controlled baselines, with clearer copy for saved setups, lock state, and reusable-vs-session authority.
- Added local draft presentation syncing so baseline edits stop pretending to be the previously saved setup once the researcher changes them.
- Updated the experiment stepper to use session-baseline language, show whether the current baseline is built-in, saved, or only local, and save the baseline explicitly into the authoritative session.

## Verification

- `bun run build` from `Frontend/`

## Notes

- No commits were created because the user explicitly requested an uncommitted workspace execution.

---
*Phase: 05-controlled-markdown-reading-baseline*
*Completed: 2026-03-31*
