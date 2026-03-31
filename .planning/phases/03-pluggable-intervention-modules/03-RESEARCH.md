# Phase 3: Pluggable Intervention Modules - Research

**Date:** 2026-03-31
**Phase:** 03 - Pluggable Intervention Modules

## Planning Question

What implementation slices will turn the current patch-based reading intervention path into an explicit intervention-module architecture with stable ids, inspectable metadata, backend-enforced guardrails, decision-strategy compatibility, and researcher-facing controls that stay coherent without hardcoded one-off branches?

## Current Runtime Assessment

### What already works

- [`Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionManager.cs`](Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionManager.cs) already owns canonical intervention application, authoritative session updates, and replay/export event recording.
- [`Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ReadingInterventionRuntime.cs`](Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ReadingInterventionRuntime.cs) already encapsulates the mutation logic for presentation and appearance changes, which gives Phase 3 a clear extraction point.
- [`Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/RuleBasedDecisionStrategy.cs`](Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/RuleBasedDecisionStrategy.cs) already produces non-manual intervention proposals, proving that the new module boundary must serve both manual and automated triggering.
- [`Frontend/src/modules/pages/researcher/current-live/components/LiveControlsColumn.tsx`](Frontend/src/modules/pages/researcher/current-live/components/LiveControlsColumn.tsx) already exposes the current intervention surface the researcher uses today: font family, font size, line width, line height, letter spacing, theme mode, palette, and participant editing lock.
- [`Backend/src/infrastructure/ReadingTheReader.Realtime.Persistence/ExperimentReplayExportSerializer.cs`](Backend/src/infrastructure/ReadingTheReader.Realtime.Persistence/ExperimentReplayExportSerializer.cs) and [`Frontend/src/lib/experiment-replay.ts`](Frontend/src/lib/experiment-replay.ts) already provide one authoritative replay/export path that Phase 3 should extend with module provenance instead of replacing.

### Where the architecture is still too coupled

1. Interventions are still patch-shaped instead of module-shaped.
   `ApplyInterventionCommand` directly carries presentation and appearance patches. That is adequate for a single hardcoded runtime, but it is not a defensible module boundary for future intervention families.

2. The runtime has one implementation site instead of a catalog.
   `ReadingInterventionRuntime` currently knows how to apply all supported changes directly. That makes new interventions likely to accumulate as more branches inside one class.

3. Decision providers still target raw intervention payloads.
   `DecisionProposalSnapshot` stores `ApplyInterventionCommand` directly, so Phase 2 strategy swappability still depends on a non-modular intervention representation.

4. Researcher controls are hardcoded to specific properties.
   The live control surface manually renders sliders, toggles, and selects for each intervention dimension instead of consuming a stable module catalog.

5. Intervention provenance does not yet identify explicit modules.
   Intervention events record source, trigger, and reason, but not a stable intervention module id or parameter bag that future replay/export users can inspect.

## Recommended Target Architecture

### 1. Introduce an explicit intervention module contract

The backend should own a first-class module seam with:

- a stable module id
- a researcher-facing name and description
- parameter descriptors
- required input declarations
- applicability and guardrail metadata
- an execution entrypoint that validates input and produces normalized presentation/appearance changes

This should live beside the existing realtime application contracts rather than in transport or frontend code.

### 2. Treat the current intervention surface as the first catalog

Phase 3 should not invent new intervention families before the seam is stable. The first explicit catalog should wrap the interventions that already exist in the product:

- `font-family`
- `font-size`
- `line-width`
- `line-height`
- `letter-spacing`
- `theme-mode`
- `palette`
- `participant-edit-lock`

This makes the first module set demonstrably useful without expanding phase scope.

### 3. Keep execution backend-authoritative

The safest posture remains:

- the frontend or decision provider requests a module plus parameters
- the backend validates applicability and parameter values
- the module produces normalized presentation/appearance changes
- `ExperimentSessionManager` remains the coordinator that applies the result, records provenance, and broadcasts authoritative state

This preserves the thesis argument that modules are pluggable without surrendering runtime authority.

### 4. Migrate intervention contracts from raw patches to module references

The current `ApplyInterventionCommand` and `InterventionEventSnapshot` shapes should evolve so they carry:

- `moduleId`
- module parameters / argument values
- source / trigger / reason
- the normalized applied result

This lets manual controls, rule-based strategies, and future external providers all point at the same intervention boundary.

### 5. Expose the module catalog to the frontend

The researcher UI should not permanently hardcode the intervention catalog. The backend should expose a module catalog contract, and the frontend should mirror it. The UI can still group controls in a familiar way, but those groups should be driven by module metadata rather than bespoke branches that know about every intervention type.

## Recommended Contract Shapes

### Backend module seam

Recommended new backend contracts:

- `InterventionModuleContracts.cs`
- `IReadingInterventionModule.cs`
- `IReadingInterventionModuleRegistry.cs`
- `ReadingInterventionModuleRegistry.cs`

Recommended descriptor/value types:

- `ReadingInterventionModuleDescriptor`
- `ReadingInterventionParameterDescriptor`
- `ReadingInterventionExecutionContext`
- `ReadingInterventionRequest`
- `ReadingInterventionValidationResult`

### Provenance and replay

Intervention events and decision proposals should reference:

- `moduleId`
- parameter values used
- normalized applied result

That gives replay/export enough information to explain not only what changed, but which module caused it and with what arguments.

### Frontend catalog and request mirrors

Recommended frontend mirrors:

- `intervention-modules.ts`
- RTK Query catalog endpoint/hook
- updated `experiment-session.ts` intervention shapes with module provenance

This keeps researcher UI logic and replay labels aligned with the backend contract.

## Recommended Plan Slices

### Slice A: Module contracts, catalog descriptors, and registry seam

Purpose:

- define the explicit module boundary
- lock the first module ids and parameter descriptors
- centralize additive registration

Likely file areas:

- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/InterventionModuleContracts.cs`
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/IReadingInterventionModule.cs`
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/IReadingInterventionModuleRegistry.cs`
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ReadingInterventionModuleRegistry.cs`
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationModuleInstaller.cs`
- `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ReadingInterventionModuleCatalogTests.cs`

Expected outcome:

- the codebase has a stable, inspectable intervention-module catalog before runtime behavior migrates

### Slice B: Runtime migration, decision integration, and provenance

Purpose:

- route manual and non-manual intervention requests through the module boundary
- move built-in intervention logic out of one generic patch path
- record explicit module provenance in decision proposals and intervention events

Likely file areas:

- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ReadingInterventionRuntime.cs`
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/LiveReadingSessionSnapshot.cs`
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/DecisionStrategyContracts.cs`
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/RuleBasedDecisionStrategy.cs`
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionManager.cs`
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentReplayExport.cs`
- `Backend/src/infrastructure/ReadingTheReader.Realtime.Persistence/ExperimentReplayExportSerializer.cs`

Expected outcome:

- interventions are executed and logged through explicit modules, and decision providers target those modules instead of raw patches

### Slice C: Catalog API and frontend contract alignment

Purpose:

- expose intervention module metadata from the backend
- mirror module descriptors and module-based intervention provenance on the frontend
- keep transport and replay models aligned with the new backend contracts

Likely file areas:

- `Backend/src/ReadingTheReader.WebApi/Contracts/InterventionModules/*.cs`
- `Backend/src/ReadingTheReader.WebApi/InterventionModuleEndpoints/*.cs`
- `Frontend/src/lib/intervention-modules.ts`
- `Frontend/src/redux/api/intervention-modules-api.ts`
- `Frontend/src/lib/experiment-session.ts`
- `Frontend/src/lib/gaze-socket.ts`
- `Frontend/src/lib/experiment-replay.ts`

Expected outcome:

- the frontend can render and explain intervention behavior from a stable module catalog and provenance model

### Slice D: Researcher live controls migrate to module-driven rendering

Purpose:

- preserve the current researcher workflow while removing hardcoded per-property intervention branches
- keep the intervention panel grouped and usable
- surface explicit module names and parameter semantics in history/metadata

Likely file areas:

- `Frontend/src/modules/pages/researcher/current-live/index.tsx`
- `Frontend/src/modules/pages/researcher/current-live/components/LiveControlsColumn.tsx`
- `Frontend/src/modules/pages/researcher/current-live/components/LiveMetadataColumn.tsx`
- `Frontend/src/modules/pages/researcher/current-live/types.ts`

Expected outcome:

- the UI remains familiar to researchers, but the implementation clearly references module metadata rather than bespoke intervention branches

## UI Planning Posture

This is not a visual redesign phase. The existing card, slider, switch, badge, and grouped-control language in the researcher live page should be preserved. The key change is the data source behind those controls: metadata-driven module rendering instead of hardcoded intervention assumptions.

No separate UI-SPEC is required as long as the planning stays within the established current-live visual language.

## Verification Strategy

Phase 3 should prove module extensibility as architecture, not just rename current properties.

Minimum automated proof should cover:

- stable module catalog ids and parameter descriptors
- runtime validation and execution through module registry lookups
- rule-based strategy compatibility with module-shaped intervention requests
- replay/export round-trips preserving module provenance
- frontend production build after catalog/provenance/UI changes

Manual verification can remain limited to researcher control coherence once the metadata-driven UI is in place.
