# Phase 3: Pluggable Intervention Modules - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase makes intervention behavior additive and inspectable by introducing an explicit intervention-module boundary around the existing reading-adaptation runtime. The goal is to represent interventions as stable modules with declared metadata, supported parameters, and safety rules so future teams can add new interventions without invasive edits across orchestration, researcher controls, or replay/export. It is not the phase for inventing new intervention families or for solving context-preservation quality in full; Phase 3 should modularize the current intervention surface first.

</domain>

<decisions>
## Implementation Decisions

### Module Boundary and Ownership
- **D-01:** Intervention modules should be backend-owned additive components resolved by stable module ids rather than hardcoded branches inside `ExperimentSessionManager`.
- **D-02:** `ExperimentSessionManager` remains the authoritative coordinator, but module-specific adaptation logic must move behind an explicit intervention-module contract.
- **D-03:** The first Phase 3 module set should wrap the intervention capabilities that already exist in the product today rather than introducing brand new experimental interventions.

### Module Contract and Metadata
- **D-04:** Each intervention module must declare inspectable metadata that at minimum includes a stable id, researcher-facing name, short description, and enough information for other layers to reference the module consistently.
- **D-05:** Each intervention module must declare its supported parameters, required inputs, and safe/default value guidance clearly enough that researchers and future contributors can understand how to use it.
- **D-06:** Intervention module contracts should be explicit enough that manual, rule-based, and external decision providers can all target the same module boundary.

### Safety and Applicability Rules
- **D-07:** Module execution stays backend-authoritative; the runtime validates module applicability and parameters before mutating session state.
- **D-08:** Each module should expose clear applicability or guardrail rules instead of relying on scattered caller knowledge.
- **D-09:** Context-preservation behavior remains a downstream reading/runtime concern and should not be reimplemented differently inside every intervention module.

### Researcher and API Surface
- **D-10:** Researcher controls should reference named intervention modules and module parameter contracts rather than shipping permanently hardcoded one-off intervention branches.
- **D-11:** The researcher UI may still group modules into familiar presentation controls, but those controls must map to stable module definitions under the hood.
- **D-12:** Runtime commands, session snapshots, and provenance records should reference intervention modules through consistent ids and payload shapes instead of type-specific special cases.

### Extensibility and Thesis Posture
- **D-13:** Adding a new intervention module should require additive registration and contract compliance rather than edits across unrelated orchestration, transport, replay, or UI layers.
- **D-14:** Module metadata and provenance should be reusable in replay/export so future analysis can explain not only that an intervention happened, but which module produced it.
- **D-15:** Phase 3 should stop at making interventions pluggable and inspectable; new adaptive behaviors or stronger reading-flow guarantees belong to later phases.

### the agent's Discretion
- Exact naming of the intervention module contracts, registry, and descriptor types.
- How modules are grouped for researcher-facing presentation, as long as grouping stays metadata-driven.
- Whether the first module catalog is represented as one module per control or a small set of focused modules, as long as each remains explicit and additive.
- Exact provenance field names, provided module identity and parameter traceability stay intact.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Thesis Scope and Phase Intent
- `.planning/PROJECT.md` - thesis framing, modularity constraints, and the requirement to defend intervention extensibility architecturally.
- `.planning/ROADMAP.md` - Phase 3 goal, dependency on Phase 2, and success criteria for pluggable intervention modules.
- `.planning/REQUIREMENTS.md` - `MOD-03` and `MOD-04`, plus the surrounding live-control and reading-flow constraints.
- `.planning/phases/02-swappable-decision-strategies/02-CONTEXT.md` - Phase 2 decisions that locked researcher-first authority, proposal flow, and the strategy seam that must now target stable intervention modules.

### Original Thesis and Requirement Sources
- `docs/frontend/thesis_proposal.md` - thesis problem statement around micro-interventions, modularity, and experimentally flexible intervention behavior.
- `docs/frontend/requirements.md` - `FR7` intervention runtime requirements plus the architecture section describing intervention modules as pluggable components.

### Existing Runtime and Integration Guidance
- `docs/backend/backend-architecture.md` - current backend orchestration/runtime shape that Phase 3 must extend without dissolving authority boundaries.
- `docs/backend/frontend-backend-integration-guide.md` - current REST/WebSocket contract posture that should keep transport separate from module semantics.
- `.planning/research/ARCHITECTURE.md` - explicit guidance to make intervention modules typed and additive instead of embedding more logic in `ExperimentSessionManager`.
- `.planning/research/FEATURES.md` - current repo evidence and thesis differentiators for intervention modules.
- `.planning/codebase/ARCHITECTURE.md` - current split between authoritative backend runtime, researcher UI, and replay/export flow.
- `.planning/codebase/STRUCTURE.md` - placement guidance for new backend module contracts and any mirrored frontend catalog/state types.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ReadingInterventionRuntime.cs`: current single implementation site for applying presentation and appearance changes; this is the clearest starting point for extracting explicit modules.
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/IReadingInterventionRuntime.cs`: existing runtime seam that can evolve from one generic implementation into an explicit module-oriented boundary.
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/LiveReadingSessionSnapshot.cs`: already defines the current intervention command and the normalized presentation/appearance primitives that first-generation modules will likely target.
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionManager.cs`: authoritative place where interventions are applied, recorded, and broadcast, which means Phase 3 should make it coordinate modules rather than encode module specifics.
- `Frontend/src/modules/pages/researcher/current-live/components/LiveControlsColumn.tsx`: current researcher UI exposes hardcoded manual controls for font family, font size, line width, line height, letter spacing, theme mode, palette, and participant edit lock.
- `Backend/src/infrastructure/ReadingTheReader.Realtime.Persistence/ExperimentReplayExportSerializer.cs`: existing export path that should keep intervention provenance aligned with the authoritative backend model.

### Established Patterns
- Phase 2 already separated decision-provider behavior from runtime authority, so Phase 3 should make decision outputs point at stable intervention modules rather than rebuilding ad hoc patch handling.
- The current intervention runtime works on normalized reading presentation and appearance snapshots, which makes it practical to define first-version modules around these existing primitives.
- Contracts are still mirrored manually across backend and frontend, so module metadata and provenance additions must be updated deliberately on both sides.
- Replay/export already records intervention events from authoritative runtime transitions, so module provenance should be added there rather than reconstructed later in the frontend.

### Integration Points
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationModuleInstaller.cs`: composition root where module registry/runtime implementations should be registered.
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/DecisionStrategyCoordinator.cs` and related decision contracts: decision outputs should target the intervention-module boundary introduced here.
- `Frontend/src/modules/pages/researcher/current-live/index.tsx` and `Frontend/src/modules/pages/researcher/current-live/components/LiveControlsColumn.tsx`: current manual controls need to evolve toward metadata-driven module controls without removing researcher authority.
- `Frontend/src/lib/experiment-session.ts` and `Frontend/src/lib/experiment-replay.ts`: frontend mirrors that will need intervention-module identity and provenance fields once the backend contracts change.

</code_context>

<specifics>
## Specific Ideas

- Treat the current reading adaptations as the first module catalog instead of inventing new intervention types immediately.
- The first catalog should cover the controls the researcher already uses today: font family, font size, line width, line height, letter spacing, theme mode, palette, and participant editing lock.
- Researcher-facing controls should still feel like a coherent intervention panel, but the underlying implementation should look like a registry of named intervention modules rather than direct property patching.
- Decision strategies from Phase 2 should be able to reference these modules without knowing UI details or runtime internals.

</specifics>

<deferred>
## Deferred Ideas

- New intervention families beyond the current presentation and appearance changes - defer until the module boundary is stable.
- Stronger context-preservation algorithms and flow-quality instrumentation - Phase 7.
- Broader replay/export thesis packaging and extension guidance - Phase 8.

</deferred>

---

*Phase: 03-pluggable-intervention-modules*
*Context gathered: 2026-03-31*
