# Phase 2: Swappable Decision Strategies - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase establishes a stable decision-strategy boundary so manual, rule-based, hybrid, and external-provider decision logic can be added or swapped without rewriting sensing, runtime orchestration, researcher control, or replay/export flows. The goal is to define how decision providers integrate, what they can see, how their outputs are handled, and how their lifecycle is recorded. It is not the phase for implementing AI models inside this repository or for introducing multi-provider conflict orchestration.

</domain>

<decisions>
## Implementation Decisions

### Strategy Output Model
- **D-01:** Phase 2 uses a mixed model with researcher-first priority.
- **D-02:** Manual researcher interventions remain a first-priority direct path and apply immediately.
- **D-03:** Non-manual decision strategies emit proposals rather than mutating the reading session directly.
- **D-04:** Session policy decides whether non-manual proposals run in advisory mode or autonomous mode.
- **D-05:** Only one unresolved non-manual proposal should be active at a time; newer outputs or manual overrides supersede older unresolved proposals rather than stacking pending items.

### Session Configuration Model
- **D-06:** The researcher-facing UI should expose a small set of predefined experiment conditions rather than raw low-level knobs.
- **D-07:** Under the hood, each session stores the selected decision provider and execution mode as separate fields so the architecture stays composable.
- **D-08:** The stored session configuration must be reproducible in logs and exports, even when the UI presents it as a named experiment condition.

### Hybrid Supervision Rules
- **D-09:** Hybrid behavior in Phase 2 includes full supervisory control rather than simple override-only behavior.
- **D-10:** In advisory mode, the researcher can explicitly approve or reject proposals.
- **D-11:** The researcher can manually intervene at any time, regardless of the active non-manual strategy mode.
- **D-12:** The researcher can pause or resume automation during a live session.
- **D-13:** The researcher can switch between advisory and autonomous execution during a session without losing authority.

### Decision Input Boundary
- **D-14:** Decision strategies receive a curated decision-context contract only, not the full internal experiment snapshot.
- **D-15:** The decision-context contract should expose only stable decision-relevant signals, such as current reading presentation and appearance, focus, aggregated attention summary, participant viewport state, recent intervention history, and session mode metadata.
- **D-16:** Transport-specific payloads, backend-only orchestration details, and arbitrary access to replay/history stores stay outside the decision-strategy contract.

### Provenance and Audit Model
- **D-17:** Decision proposals and their lifecycle should be modeled separately from applied intervention events.
- **D-18:** Applied interventions remain their own event stream and should link back to the proposal that caused them when applicable.
- **D-19:** Direct manual interventions must be representable even when they are not derived from a prior proposal.
- **D-20:** Proposal lifecycle states should support the mixed execution model and at minimum distinguish pending, approved, rejected, auto-applied, superseded, and expired outcomes.

### the agent's Discretion
- Exact naming of the provider, execution-mode, and proposal lifecycle contracts.
- The exact first-version shape of the curated decision-context object, as long as it stays deliberately narrower than the full runtime snapshot.
- The timeout/expiry policy for unresolved proposals.
- Whether phase 2 stores one active unresolved proposal globally or one per provider, as long as the shipped UX never surfaces multiple unresolved items to the researcher at once.
- Whether switching execution mode mid-session preserves the current unresolved proposal or supersedes it immediately.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Thesis Scope and Phase Intent
- `.planning/PROJECT.md` - project-level thesis framing, modularity constraints, and the explicit requirement to support external AI-style decision providers architecturally rather than implementing models in-repo.
- `.planning/ROADMAP.md` - Phase 2 goal, dependency on Phase 1, and success criteria for swappable decision strategies.
- `.planning/REQUIREMENTS.md` - `MOD-02` plus the surrounding extensibility, researcher-control, and logging constraints that shape the strategy boundary.
- `.planning/phases/01-experiment-authority-sensing-boundary/01-CONTEXT.md` - Phase 1 decisions that established backend runtime authority, transport ingress separation, and interface-first module boundaries that Phase 2 must extend rather than bypass.

### Original Thesis and Requirement Sources
- `docs/frontend/thesis_proposal.md` - thesis problem statement and research objectives calling for separation of sensing, decision-making strategies, and UI adaptation, plus support for both AI-based and human-controlled intervention within one system.
- `docs/frontend/requirements.md` - original functional requirements for interchangeable decision strategies, manual/automated/hybrid triggering, experiment conditions, and provenance of intervention origins/rationales.

### Existing Runtime and Integration Guidance
- `docs/backend/backend-architecture.md` - current backend runtime authority and transport flow, useful for understanding where the existing manual intervention path currently lives.
- `docs/backend/frontend-backend-integration-guide.md` - current REST and WebSocket integration model that Phase 2 must preserve while introducing a new strategy seam.
- `.planning/codebase/ARCHITECTURE.md` - generated architecture map showing the current split between transport, application, frontend live view, and canonical backend session ownership.
- `.planning/codebase/STRUCTURE.md` - generated placement guide for where new backend strategy contracts and frontend configuration surfaces should be introduced.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentCommandIngress.cs`: already provides a transport-to-application ingress seam that can remain stable while strategy commands and proposal handling are introduced behind it.
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionManager.cs`: remains the canonical runtime authority and current place where manual intervention application and replay/event history are recorded.
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ReadingInterventionRuntime.cs`: already encapsulates intervention application logic and should stay downstream of strategy decisions rather than becoming strategy-specific.
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/RealtimeIngressCommands.cs`: already defines typed realtime ingress commands and is a natural place to keep transport parsing separate from strategy behavior.
- `Frontend/src/modules/pages/researcher/current-live/index.tsx` and `Frontend/src/modules/pages/researcher/current-live/components/LiveControlsColumn.tsx`: already expose the manual researcher control path and can evolve into the supervisory surface for advisory/autonomous strategy control.
- `Frontend/src/lib/gaze-socket.ts`: already carries the manual `applyIntervention` realtime command and mirrored session/intervention updates, making it the obvious client transport touchpoint for new proposal and session-mode messages.

### Established Patterns
- Backend runtime authority is still centralized in one singleton service, so Phase 2 should introduce strategy contracts around that authority rather than splitting canonical ownership away from it.
- Transport parsing already stays outside orchestration, so strategy selection and proposal handling should follow the same pattern instead of teaching raw WebSocket message types to strategy implementations.
- Contracts are mirrored manually between backend and frontend, so any new proposal, configuration, or provenance contracts must be updated deliberately on both sides.
- Current applied intervention logging only captures applied outcomes, which is insufficient for advisory-mode strategy proposals and motivates a separate proposal lifecycle model.

### Integration Points
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationModuleInstaller.cs`: composition root where the first stable decision-strategy contract and provider registration should be installed.
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/IExperimentRuntimeAuthority.cs`: current downstream application boundary that will need to cooperate with strategy proposal approval/application flow.
- `Frontend/src/lib/experiment-session.ts`: current frontend mirror of reading-session and intervention event contracts that will need to grow to include strategy-session configuration and proposal state.
- `Frontend/src/modules/pages/researcher/current-live/index.tsx`: existing live researcher surface where advisory proposals, pause/resume, and mode switching should appear without moving authority out of the backend.

</code_context>

<specifics>
## Specific Ideas

- The researcher should always have first priority over any external or automated decision maker.
- The same non-manual provider should be able to run in either advisory mode or autonomous mode depending on the experiment condition selected for the session.
- Manual researcher interventions should still apply immediately even while autonomous automation is active.
- Unresolved non-manual proposals should not pile up; stale proposals should be superseded rather than left indefinitely actionable after context changes.

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope.

</deferred>

---

*Phase: 02-swappable-decision-strategies*
*Context gathered: 2026-03-26*
