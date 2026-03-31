# Phase 4: Device Setup & Calibration Workflow - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning
**Source:** Derived during `$gsd-plan-phase 4` from roadmap, requirements, and current codebase

<domain>
## Phase Boundary

Phase 4 should turn the existing eye-tracker selection, licensing, calibration, validation, and reading-session start requirements into one coherent researcher workflow. The goal is not to replace the Tobii integration or redesign the whole product. The goal is to make setup state authoritative, calibration quality inspectable, and session start reliably blocked until the required prerequisites are satisfied from inside the application.

</domain>

<decisions>
## Implementation Decisions

### Workflow Ownership and Authority
- **D-01:** The backend remains the source of truth for whether setup is ready. The frontend may cache local draft state for form UX, but session-start gating must come from authoritative backend state rather than local heuristics alone.
- **D-02:** Phase 4 should preserve the dedicated full-screen calibration route because that route already matches the hardware-driven target flow, but it must behave like one step inside the larger researcher setup workflow rather than an unrelated side quest.
- **D-03:** The experiment setup page should become the primary researcher-operated workflow for preparing a session. Device selection, participant setup, calibration status, reading material readiness, and start gating must read like one guided path.

### Device and Licence Handling
- **D-04:** Detecting connected eye trackers and selecting exactly one active tracker must stay in-app and researcher controlled.
- **D-05:** Licence handling must remain tied to the selected device and the existing saved-licence store semantics. Phase 4 should harden the workflow around those semantics, not replace them with a new storage model.
- **D-06:** The workflow should explicitly surface whether a saved licence is present, whether a replacement upload is required, and whether the selected tracker is currently the active hardware target.

### Calibration and Validation
- **D-07:** Calibration is not complete unless validation passes. Session readiness must reflect the validated outcome, not only that calibration mode was entered or a run was attempted.
- **D-08:** Researchers must be able to review calibration quality metrics before starting a session. The workflow should expose quality in the experiment setup flow, not only on the transient calibration page.
- **D-09:** Calibration interruption cases such as leaving full screen, hiding the tab, or failed point collection must feed back into the guided setup workflow clearly enough that the researcher knows why session start is still blocked.

### Setup Readiness Projection
- **D-10:** The existing `ExperimentSetupSnapshot` is too coarse for the Phase 4 workflow. The authoritative setup model should explain blocking reasons and per-step readiness, not only booleans and a coarse current index.
- **D-11:** Backend start validation and frontend disabled-state logic should tell the same story. If the backend would reject session start, the frontend should already display the relevant blocking reason.
- **D-12:** Reading material selection remains part of the start gate, but Phase 4 should not redesign reading-material authoring itself.

### Scope Control
- **D-13:** Phase 4 should not add advanced hardware fleet management, cloud licence administration, or new Tobii features beyond the current experiment setup needs.
- **D-14:** Calibration settings editing remains in the settings area; Phase 4 should consume those settings in the guided workflow rather than moving all calibration configuration into the experiment page.
- **D-15:** Participant reading-view polish and context-preserving interventions belong to later phases. Phase 4 should focus on setup reliability and operator clarity.

### the agent's Discretion
- Exact naming and placement of richer setup-readiness contracts, as long as they stay backend-owned and transport-safe.
- Whether setup readiness is expressed by enriching `ExperimentSessionSnapshot` directly or by introducing focused nested setup-checklist records.
- How the experiment page visually presents the guided setup flow, provided it preserves the established researcher-facing visual language and clearly exposes blocking reasons.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Thesis Scope and Phase Intent
- `.planning/PROJECT.md` - thesis constraints, Tobii hardware requirement, researcher-operated workflow priority, and modularity posture.
- `.planning/ROADMAP.md` - Phase 4 goal, dependency on Phase 3, and the success criteria for one guided setup workflow.
- `.planning/REQUIREMENTS.md` - `SETUP-01` through `SETUP-06`, which define the required setup behavior.
- `.planning/STATE.md` - current project position and the note that Phase 4 should turn existing setup/calibration flows into one guided workflow with proper gating.

### Original Requirement and Architecture Sources
- `docs/frontend/thesis_proposal.md` - thesis framing around real experiments, Tobii-backed sensing, and defendable researcher workflows.
- `docs/frontend/requirements.md` - original setup, calibration, and experiment-operation expectations.
- `docs/backend/backend-architecture.md` - backend authority and realtime orchestration posture that Phase 4 must preserve.
- `docs/backend/frontend-backend-integration-guide.md` - current REST/WebSocket contract split that should remain intact.

### Existing Code That Defines Today’s Flow
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/SensingOperations.cs` - device discovery, licence selection, and hardware calibration operations.
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/CalibrationService.cs` - authoritative calibration and validation lifecycle.
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionManager.cs` - current setup snapshot projection and session-start gate.
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionSnapshot.cs` - current coarse setup status shape.
- `Frontend/src/modules/pages/experiment/components/eyetracker-setup.tsx` - current device/licence step.
- `Frontend/src/modules/pages/experiment/components/calibration-step.tsx` - current calibration step that mostly launches the dedicated route.
- `Frontend/src/modules/pages/experiment/components/experiment-stepper.tsx` - current guided flow and start button orchestration.
- `Frontend/src/modules/pages/calibration/index.tsx` - current full-screen calibration/validation experience.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SensingOperations.cs` already supports connected-device discovery, saved-licence lookup, tracker selection, calibration, and validation entrypoints. Phase 4 should wrap these operations in better workflow projection rather than replacing the sensing seam.
- `CalibrationService.cs` already implements a full calibration plus validation lifecycle with backend-owned pass/fail state and quality values.
- `ExperimentSessionManager.cs` already blocks `StartSessionAsync()` if the eye tracker, participant, calibration, or reading material are not ready.
- `experiment-stepper.tsx` already organizes setup into a guided sequence, which gives Phase 4 a strong UX host page instead of requiring a new top-level route.
- `calibration/index.tsx` already handles the full-screen gaze/calibration choreography, interruption handling, and acceptance flow.

### Current Gaps
- The frontend still relies heavily on local Redux draft state to decide whether setup steps look complete.
- The coarse `ExperimentSetupSnapshot` booleans do not explain why a step is blocked or whether a selected tracker still needs licensing.
- `selectEyetracker` currently returns no authoritative payload, which encourages local-only completion assumptions.
- The calibration step in the experiment flow mostly links out to `/calibration` and only mirrors a narrow subset of the authoritative calibration state.
- Start readiness is enforced by the backend, but the guided workflow does not yet project the same readiness reasons clearly before the researcher presses Start.

### Integration Points
- `Backend/src/ReadingTheReader.WebApi/EyeTrackerEndpoints/*.cs` and `Backend/src/ReadingTheReader.WebApi/CalibrationEndpoints/*.cs` define the transport surfaces that the experiment flow consumes.
- `Frontend/src/redux/api/eyetracker-api.ts`, `Frontend/src/redux/api/experiment-session-api.ts`, and calibration API hooks are the frontend contract seams that must align with richer setup state.
- `Frontend/src/modules/pages/settings/sections/CalibrationSettingsSection.tsx` is the existing home of calibration configuration; the Phase 4 workflow should consume, not duplicate, those settings.

</code_context>

<specifics>
## Specific Ideas

- Keep the experiment page as the researcher’s home base, but make it show authoritative setup readiness, calibration summary, and blocking reasons inline.
- Treat the calibration page as a focused hardware-run subflow that returns the researcher to the experiment setup once validation passes or fails.
- Project device selection, licence availability, calibration quality, reading material readiness, and start eligibility in one consistent setup model.
- Add backend tests around setup readiness and start gating before broad UI refactors so the workflow truth is pinned down early.

</specifics>

<deferred>
## Deferred Ideas

- Rich hardware diagnostics dashboards or historical device-health reporting.
- Advanced multi-device management beyond choosing one active tracker for the current session.
- Visual redesign work unrelated to setup clarity.
- Participant reading-flow quality and intervention continuity work, which belong to later phases.

</deferred>

---

*Phase: 04-device-setup-calibration-workflow*
*Context gathered: 2026-03-31*
