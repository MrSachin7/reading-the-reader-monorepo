# Phase 1: Experiment Authority & Sensing Boundary - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase establishes the defensible core runtime for the thesis platform. It introduces one authoritative experiment orchestration path while separating hardware sensing, reader observation, transport ingress, and downstream adaptation concerns behind explicit contracts. The goal is not to finish the full plug-and-play architecture in one phase, but to extract the foundational seams that later decision-strategy and intervention modules will depend on.

</domain>

<decisions>
## Implementation Decisions

### Runtime Authority
- **D-01:** The backend keeps one authoritative experiment orchestration runtime for session lifecycle and canonical experiment state.
- **D-02:** Modules own their internal responsibility, but cross-module coordination happens through orchestration rather than through peer modules reaching into each other directly.
- **D-03:** Dependencies across module boundaries should go through interfaces/contracts only; modules should not receive information they do not need.

### Boundary Separation
- **D-04:** The sensing boundary and the reader-observation boundary are separate concerns and must not be collapsed into one module.
- **D-05:** The sensing boundary is hardware-facing and device-agnostic. It should cover device discovery, selection, licensing, calibration/validation, and raw gaze acquisition without leaking Tobii SDK details.
- **D-06:** The reader-observation boundary is application-facing and should cover participant viewport, reading focus, attention summaries, and similar derived reading-state observations without being treated as hardware sensing.

### Canonical State Ownership
- **D-07:** The backend owns canonical experiment/session truth. Frontend clients may report participant-side observations and interaction events, but the backend validates, stores, and rebroadcasts the authoritative runtime state.

### Transport and Command Ingress
- **D-08:** Phase 1 should introduce a full command-ingress boundary so both REST and WebSocket traffic are translated into application-level commands before orchestration handles them.
- **D-09:** Transport-specific message parsing should remain in transport layers; orchestration should not be the place that understands raw WebSocket envelope types or HTTP payload shapes.

### Rewrite Depth
- **D-10:** Phase 1 is a real architectural extraction phase, not a cosmetic wrapper pass.
- **D-11:** The work should start the deeper rewrite where it materially improves the modular foundation, while stopping short of implementing the full plugin system intended for later phases.

### the agent's Discretion
- Exact naming and packaging of the new orchestration, sensing, observation, and ingress contracts.
- Whether the current `ExperimentSessionManager` is retained as the orchestration core and reduced in responsibility incrementally, or split into smaller collaborators behind a stable orchestration interface.
- How aggressively REST endpoints are aligned with the new ingress contract in the first pass, as long as both REST and WebSocket end up entering the runtime through the same application-level command boundary.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Thesis Intent and Scope
- `.planning/PROJECT.md` - thesis framing, non-negotiables, and project-level priorities.
- `.planning/ROADMAP.md` - Phase 1 goal, dependencies, and success criteria.
- `.planning/REQUIREMENTS.md` - `MOD-01` and `MOD-05`, plus the surrounding modularity and runtime constraints.
- `docs/frontend/thesis_proposal.md` - thesis objectives, research questions, and the requirement to separate sensing, decision-making, and UI adaptation.
- `docs/frontend/requirements.md` - original functional and non-functional requirement set, especially modularity, gaze-to-content exposure, low-latency, and experiment control.

### Existing Architecture and Integration Guidance
- `docs/backend/backend-architecture.md` - current backend layering, realtime flow, and the existing central role of `ExperimentSessionManager`.
- `docs/backend/frontend-backend-integration-guide.md` - current transport contracts and frontend/backend realtime integration expectations.
- `.planning/codebase/ARCHITECTURE.md` - generated architecture map of current runtime ownership and flow across frontend, Web API, application, and infrastructure layers.
- `.planning/codebase/STRUCTURE.md` - generated placement rules and key file locations relevant to where Phase 1 changes should land.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionManager.cs`: existing backend authority for lifecycle, setup gating, snapshots, gaze streaming, participant-view sync, and intervention application. It is the natural starting point for orchestration extraction.
- `Backend/src/core/ReadingTheReader.core.Application/InfrastructureContracts/IEyeTrackerAdapter.cs`: already provides a device-facing abstraction that can anchor the sensing boundary.
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/EyeTrackerService.cs`: already acts as a narrower use-case service around eye-tracker selection and session start/stop.
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/CalibrationService.cs`: already isolates calibration/validation workflow from raw Tobii implementation details and can inform the sensing seam.
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ReadingInterventionRuntime.cs`: shows an existing runtime-specific module that should depend on orchestration contracts rather than on hardware or transport details.

### Established Patterns
- Backend layering already separates `WebApi`, `core.Application`, `core.Domain`, and `infrastructure`, so Phase 1 should strengthen those seams rather than introduce a new architecture style.
- The backend currently centralizes session truth in a singleton application service registered in `ApplicationModuleInstaller.cs`.
- Realtime contracts are mirrored manually between backend C# records/message names and frontend TypeScript types, so contract churn has cross-repo cost and should be deliberate.
- Frontend realtime state already flows outside Redux through `Frontend/src/lib/gaze-socket.ts`, which makes a stricter ingress boundary feasible without redesigning the whole frontend state stack.

### Integration Points
- `Backend/src/ReadingTheReader.WebApi/Websockets/WebSocketConfiguration.cs`: current WebSocket ingress that forwards raw envelopes straight into orchestration and should be decoupled through a command-ingress boundary.
- `Backend/src/ReadingTheReader.WebApi/ExperimentSessionEndpoints/*.cs` and `Backend/src/ReadingTheReader.WebApi/EyeTrackerEndpoints/*.cs`: current REST ingress surface that must converge toward the same application command boundary.
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationModuleInstaller.cs`: composition root for new orchestration, sensing, observation, and ingress services.
- `Frontend/src/lib/gaze-socket.ts`: frontend transport client that currently emits participant observation events and will need to align with any new ingress contract without taking ownership of canonical experiment state.

</code_context>

<specifics>
## Specific Ideas

- Modules should own their own responsibility and depend on interfaces rather than concrete implementations.
- Boundaries should expose only the information a consuming module actually needs, not a broader shared runtime object.
- Reader observation is not the same as sensing and should be modeled independently.
- This phase should start the deeper architectural rewrite where it materially supports later plug-and-play work.

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope.

</deferred>

---

*Phase: 01-experiment-authority-sensing-boundary*
*Context gathered: 2026-03-26*
