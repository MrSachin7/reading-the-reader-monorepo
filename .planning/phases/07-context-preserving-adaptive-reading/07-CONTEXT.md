# Phase 7: Context-Preserving Adaptive Reading - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning
**Source:** Derived during Phase 7 startup from roadmap, requirements, prior phases, and current codebase

<domain>
## Phase Boundary

Phase 7 should make live reading adaptations preserve continuity strongly enough that the thesis can defend them as supportive micro-interventions instead of disruptive layout shocks. The goal is not to invent a new intervention catalog, redesign the live console, or finish replay/export evidence. The goal is to harden how layout-changing presentation updates preserve place, expose degradation clearly, and keep reading rhythm credible during live sessions.

</domain>

<decisions>
## Implementation Decisions

### Authority and Ownership
- **D-01:** Backend experiment authority remains the source of truth for when interventions are applied and which presentation state is active. Phase 7 must not create a separate browser-owned intervention lifecycle.
- **D-02:** Context preservation should build on the participant route's existing viewport and reading-focus signals, not on researcher-side approximations alone.
- **D-03:** The current `ReaderShell` and `usePreserveReadingContext` path is the starting point for Phase 7. The phase should harden and validate that seam instead of replacing it with a second unrelated anchoring system.

### Continuity and Guardrails
- **D-04:** Layout-changing interventions must preserve the currently read text region using stable token or block identity whenever possible, not only coarse scroll percentage recovery.
- **D-05:** Context-preservation quality must be treated as part of intervention safety. Phase 7 should add explicit guardrails around disruptive presentation changes rather than assuming every allowed module execution is equally safe during live reading.
- **D-06:** Degraded or failed context preservation must become observable runtime evidence instead of a silent best-effort behavior.

### Prior Decisions Carried Forward
- **D-07:** Manual researcher interventions remain a first-class path and must benefit from the same continuity guarantees as automated or approved strategy-driven interventions.
- **D-08:** Exact participant mirroring remains the preferred trust model for researcher supervision, so any new continuity evidence should strengthen that live-monitoring story instead of creating a parallel workflow.
- **D-09:** Phase 7 should improve continuity for the existing thesis-relevant presentation controls and intervention modules before expanding to new intervention families.

### Scope Control
- **D-10:** Phase 7 should not broaden Markdown support, add PDF support, or redesign the saved reading-baseline authoring flow.
- **D-11:** Phase 7 should not turn into a replay/export packaging phase. It may add the minimum runtime evidence needed for continuity inspection, but full reproducibility/export closure belongs to Phase 8.
- **D-12:** Phase 7 should not move decision logic or intervention execution into the participant UI. The thesis argument still depends on clean separation between decision, execution, and rendering.

### the agent's Discretion
- Exact continuity metrics and thresholds, as long as they help distinguish preserved, degraded, and failed outcomes during live interventions.
- Whether continuity evidence is projected primarily through researcher-live indicators, replay-facing event data, or both, provided Phase 7 surfaces runtime degradation clearly enough for later inspection.
- Whether the anchoring strategy should favor token anchors, nearby fallback tokens, block anchors, or a layered combination, provided it preserves reading place more reliably than scroll-only recovery.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Thesis Scope and Phase Intent
- `.planning/PROJECT.md` - thesis framing, modularity constraints, and the explicit goal of preserving reading flow during adaptive changes.
- `.planning/ROADMAP.md` - Phase 7 goal, dependency chain, and success criteria for context-preserving adaptive reading.
- `.planning/REQUIREMENTS.md` - `FLOW-01` through `FLOW-04`, plus surrounding reading, live-monitoring, and modularity constraints.
- `.planning/STATE.md` - current project position and the explicit note that Phase 7 planning should define how continuity quality is evaluated under live interventions.

### Prior Phase Decisions
- `.planning/phases/03-pluggable-intervention-modules/03-CONTEXT.md` - intervention modules are additive, backend-owned, and should not each reinvent context-preservation behavior separately.
- `.planning/phases/05-controlled-markdown-reading-baseline/05-CONTEXT.md` - participant reader stability, authoritative baseline ownership, and the explicit deferment of advanced context preservation to Phase 7.
- `.planning/phases/06-researcher-live-mirror-session-operations/06-CONTEXT.md` - exact-mirror trust model, live supervision posture, and the explicit deferment of context-preservation quality to Phase 7.

### Original Requirement Sources
- `docs/frontend/requirements.md` - original user stories and `FR9.1` to `FR9.3` for anchoring, viewport adjustment, and logging context-preservation failures.
- `docs/frontend/thesis_proposal.md` - thesis rationale for context-preserving micro-interventions, rhythmic reading flow, and low perceived disruption.
- `docs/backend/backend-architecture.md` - backend authority and transport boundaries that Phase 7 must preserve while adding continuity behavior.

### Current Research Guidance
- `.planning/research/SUMMARY.md` - roadmap-level guidance that context preservation is a thesis-critical behavior, not presentation polish.
- `.planning/research/PITFALLS.md` - explicit warnings about interventions that break reading continuity and the need for guardrails, anchors, and inspectable effects.

### Current Runtime and Reader Code
- `Frontend/src/modules/pages/reading/components/ReaderShell.tsx` - participant reader shell where presentation changes, focus tracking, viewport metrics, and context preservation already converge.
- `Frontend/src/modules/pages/reading/lib/usePreserveReadingContext.ts` - existing token-anchor capture and restore hook that Phase 7 should evaluate and harden.
- `Frontend/src/modules/pages/reading/pages/ReadingPage.tsx` - authoritative participant route that streams viewport and focus updates and applies reader options.
- `Frontend/src/lib/reader-shell-settings.ts` - current settings model for preserve-context and highlight-context behavior across participant, researcher mirror, and replay surfaces.
- `Frontend/src/modules/pages/researcher/current-live/components/LiveControlsColumn.tsx` - researcher controls that already expose preserve-context options and are the natural place for continuity-health evidence.
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Interventions/ReadingInterventionRuntime.cs` - authoritative intervention execution path for live presentation changes.
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Session/ExperimentSessionManager.cs` - canonical runtime owner of participant viewport state, reading focus updates, intervention application, and live monitoring projection.
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Session/ExperimentSessionSnapshot.cs` - authoritative session contract that may need continuity evidence projected through it.
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Reading/LiveReadingSessionSnapshot.cs` - current live reading-session shape for presentation, focus, viewport, and intervention state.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `usePreserveReadingContext.ts` already captures a primary active-token anchor plus nearby fallback tokens, then tries multi-frame restoration after presentation changes.
- `ReaderShell.tsx` already calls `captureContextAnchor()` before local presentation updates and already receives participant viewport and focus signals through one component boundary.
- `ReadingPage.tsx` already sends authoritative participant viewport metrics and focus updates over realtime transport, which gives Phase 7 real live inputs instead of needing new browser heuristics.
- `reader-shell-settings.ts` and `LiveControlsColumn.tsx` already expose preserve-context and highlight-context toggles across participant, researcher-mirror, and replay views.
- `ExperimentSessionManager.cs` already records participant viewport and focus events, so continuity evidence has a backend-owned place to attach.

### Current Gaps
- The current preservation logic is mostly frontend-local and best-effort; it does not yet project explicit preserved-versus-degraded outcomes into authoritative session monitoring.
- The current anchoring path depends on the gaze-active token being available at the moment a change is captured, which leaves weak fallback behavior when focus is stale or absent.
- Layout-changing interventions can still fire without explicit continuity guardrails such as magnitude, cadence, cooldown, or outcome quality thresholds.
- The researcher live surface exposes focus freshness and mirror trust, but not yet a direct signal for context-preservation success or degradation during live interventions.

### Integration Points
- Phase 7 will likely span `Frontend/src/modules/pages/reading/**`, `Frontend/src/modules/pages/researcher/current-live/**`, and backend realtime session contracts under `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/**`.
- Any continuity evidence added to the backend session snapshot must stay mirrored in the frontend session contract consumers.
- Intervention-module execution from Phase 3 and decision/supervision flows from Phase 2 should consume the same continuity guardrails rather than creating path-specific behavior.

</code_context>

<specifics>
## Specific Ideas

- Measure continuity around each layout-changing intervention using the active token anchor, nearby fallback anchors, and viewport deltas before and after the change.
- Surface whether continuity was preserved, degraded, or failed in the researcher live workflow instead of leaving the behavior invisible.
- Prefer additive hardening of the existing reader and session contracts over a large reader rewrite.
- Treat "reading can continue without obvious loss of place" as the actual acceptance bar, not merely "scroll position changed less than expected."

</specifics>

<deferred>
## Deferred Ideas

- New intervention families beyond the current thesis-relevant presentation and appearance controls.
- Broader replay/export schema closure and reproducibility packaging, which belong to Phase 8.
- Any redesign of the setup workflow or live mirror trust model beyond what is needed to expose continuity evidence.

</deferred>

---

*Phase: 07-context-preserving-adaptive-reading*
*Context gathered: 2026-04-01*
