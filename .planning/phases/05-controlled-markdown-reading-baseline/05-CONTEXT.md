# Phase 5: Controlled Markdown Reading Baseline - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning
**Source:** Derived during Phase 5 startup from roadmap, requirements, and current codebase

<domain>
## Phase Boundary

Phase 5 should turn the existing reading-material setup flow, reader shell, and reading-session snapshot into one defensible Markdown reading baseline for live experiments. The goal is not to build adaptive reading polish yet. The goal is to make the participant view reliably render backend-owned Markdown content, let the researcher define the allowed presentation conditions, and keep the active reading surface experimentally controlled once a session starts.

</domain>

<decisions>
## Implementation Decisions

### Baseline Ownership
- **D-01:** The backend remains the authority for active reading-session content and presentation. The participant view may keep local helpers for UX continuity, but an active session must not silently fall back to mock content or stale local draft state.
- **D-02:** Reading material setup remains the researcher-owned authoring surface for Markdown text, questions, and default presentation values. Phase 5 should harden and connect that flow rather than replace it with a new editor model.
- **D-03:** The experiment setup flow remains the place where a saved reading setup becomes the authoritative session baseline.

### Controlled Presentation Conditions
- **D-04:** Typography and spacing controls for the baseline stay limited to the existing thesis-relevant set: font family, font size, line width, line height, and letter spacing.
- **D-05:** Contrast and broader appearance choices should be expressed through the existing reader appearance/session appearance surface rather than a second unrelated settings store.
- **D-06:** Researcher control must include whether the active session presentation is editable at all. Phase 5 should treat that lock as an explicit session condition, not as an incidental frontend toggle.

### Participant Reading Stability
- **D-07:** The participant reading page should behave like a calm, stable surface with first-class loading, missing-session, and degraded-session states.
- **D-08:** Markdown rendering reliability matters more than rich Markdown feature breadth. The current minimal parser can stay if the rendered reading baseline is stable and predictable for thesis experiments.
- **D-09:** Reader controls should respect the configured lock state so the participant cannot drift outside the intended experiment condition.

### Scope Control
- **D-10:** Phase 5 should not solve live mirror fidelity, runtime health metrics, or manual intervention workflows. Those remain in Phase 6.
- **D-11:** Phase 5 should not solve context-preserving adaptation quality under live layout changes. That belongs to Phase 7.
- **D-12:** Phase 5 should not add PDF support, collaborative authoring, or a full CMS for reading materials.

### the agent's Discretion
- Exact naming and placement of any new backend-owned reading-baseline or lock-state contracts, as long as they remain transport-safe and mirrored clearly on the frontend.
- Whether presentation lock semantics live inside the existing reading-session presentation snapshot or a sibling session-baseline record.
- How the reading-material setup and experiment-stepper UX present “saved baseline” versus “local draft” distinctions, provided the researcher can tell what is actually controlled by the active session.

</decisions>

<canonical_refs>
## Canonical References

- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/ReadingMaterialSetups/ReadingMaterialSetupService.cs` - saved Markdown setup validation and persistence boundary.
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionManager.cs` - authoritative reading-session content and presentation ownership.
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionSnapshot.cs` - session and reading-session transport shape.
- `Backend/src/ReadingTheReader.WebApi/Contracts/ExperimentSession/UpsertReadingSessionRequest.cs` - reading-session transport request for experiment setup.
- `Frontend/src/modules/pages/reading-material-setup/index.tsx` - researcher authoring and preview flow for reading setups.
- `Frontend/src/modules/pages/experiment/components/experiment-stepper.tsx` - guided setup flow where a reading setup becomes the active session baseline.
- `Frontend/src/modules/pages/reading/pages/ReadingPage.tsx` - participant reading route and current fallback behavior.
- `Frontend/src/modules/pages/reading/components/ReaderShell.tsx` - reusable reading container with toolbar, focus mode, gaze hooks, and context preservation hooks.
- `Frontend/src/modules/pages/reading/components/MarkdownReader.tsx` - current Markdown rendering output.
- `Frontend/src/modules/pages/reading/lib/useReadingSettings.ts` - local reading setup persistence and current drift risk.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Saved reading-material setups already capture Markdown plus presentation defaults, which gives Phase 5 a real persistence model instead of requiring a new baseline schema.
- `ExperimentSessionManager.SetReadingSessionAsync()` already writes backend-owned content, presentation, and appearance into the authoritative live session.
- The participant reading route already renders from `liveSession.readingSession` when available and already uses the shared `ReaderShell`.
- `ReaderShell` already centralizes typography application, progress tracking, focus mode, toolbar behavior, gaze overlays, and context hooks.
- The experiment stepper already distinguishes local reading draft state from authoritative saved session state after Phase 4.

### Current Gaps
- The participant reading route still falls back to local draft or mock content in ways that weaken thesis-grade session authority during active use.
- Local storage reading settings remain strong enough to blur the boundary between researcher-authored baseline and active-session truth.
- Presentation lock semantics exist as `editableByResearcher`, but the UX and transport story are not yet clearly framed as controlled session conditions.
- The reading-material setup surface is functional but not yet tuned around “define baseline, preview it, and save a controlled condition” as one explicit workflow.
- The reading page does not yet treat loading, missing content, and backend-unconfigured states as first-class researcher/participant-safe outcomes.

### Integration Points
- `Frontend/src/redux/api/reading-material-api.ts` is the frontend contract seam for saved Markdown setups.
- `Frontend/src/lib/experiment-session.ts` mirrors the backend session-reading contract and must stay aligned if Phase 5 enriches the reading baseline or lock state.
- `Frontend/src/lib/reader-appearance.ts` and the existing session appearance payload already provide a home for appearance/contrast choices.
- `Frontend/src/modules/pages/researcher/current-live/components/LiveReaderColumn.tsx` reuses the reader shell and will need to stay compatible with any baseline/session contract changes even though its main improvements belong to Phase 6.

</code_context>

<specifics>
## Specific Ideas

- Make the active participant reader refuse ambiguous fallbacks once a session is active, and instead show explicit missing/loading states if the backend session is not ready.
- Treat the saved reading setup as the experiment baseline artifact, then ensure the experiment setup flow clearly saves that baseline into the authoritative session before start.
- Clarify and enforce the lock state around typography controls so the participant view behaves as an experimentally controlled surface, not a personal reader app.
- Add narrow backend and frontend checks around session-baseline authority before broad UI refactors.

</specifics>

<deferred>
## Deferred Ideas

- Richer Markdown feature support beyond the current thesis reading needs.
- Researcher live mirror fidelity and health telemetry, which belong to Phase 6.
- Advanced context-preservation anchors and adaptive transition quality, which belong to Phase 7.
- Export/replay-specific reader provenance and documentation closure, which belong to Phase 8.

</deferred>

---

*Phase: 05-controlled-markdown-reading-baseline*
*Context gathered: 2026-03-31*
