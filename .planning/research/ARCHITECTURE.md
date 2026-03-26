# Project Research: Architecture

## Research Question

How should an adaptive reading experiment platform be structured so the thesis can defend strong modularity, support plug-and-play intervention and decision layers, and still deliver reliable realtime researcher and participant workflows?

## Architectural thesis

The architecture should center on a single authoritative experiment/session core, with explicit seams around:

- sensing
- session state
- decision strategies
- intervention modules
- researcher controls
- participant UI adaptation
- logging/export/replay

This is a better fit for the thesis than a distributed or plugin-runtime-heavy design because it keeps the reasoning and evidence trail explicit.

## Recommended component boundaries

### 1. Sensing boundary

- Owns hardware discovery, licensing, calibration, validation, and raw gaze acquisition.
- Should expose clean normalized events and device/calibration state to the rest of the system.
- Must not own decision logic or participant UI behavior.

### 2. Session orchestration boundary

- Owns authoritative experiment state.
- Merges setup state, participant state, live gaze input, intervention events, and export history.
- Should be the only place that decides what the current experiment/session snapshot is.

### 3. Decision strategy boundary

- Consumes structured session and reading-state input.
- Produces intervention intents or “no action”.
- Must be swappable: manual, rule-based, hybrid, external AI provider.
- Should not directly mutate UI or hardware state.

### 4. Intervention boundary

- Accepts intervention commands and applies them through a controlled schema.
- Should declare supported parameters and expected inputs.
- Must preserve context and avoid arbitrary UI mutation.

### 5. Presentation / reader adaptation boundary

- Applies intervention outputs to the participant reader in a predictable way.
- Owns context preservation and reading-flow stability during layout changes.
- Should be separate from the decision source that triggered the change.

### 6. Researcher control boundary

- Observes the live session.
- Can trigger manual interventions or select experiment modes.
- Must not become the hidden source of business logic that bypasses the architectural seams above.

### 7. Export and replay boundary

- Records enough structured session history to reproduce and analyze what happened.
- Should treat replay and export as first-class research concerns, not debug leftovers.

## Comparison to the current repo

### What already aligns well

- The repo already has a frontend/backend split appropriate for participant/researcher UX plus backend-owned session authority.
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionManager.cs` already acts as the authoritative experiment/session state owner.
- Hardware, websocket broadcast, and persistence are already isolated in infrastructure projects under `Backend/src/infrastructure`.
- The participant reader and researcher mirror already exist as distinct UI surfaces in `Frontend/src/modules/pages/reading/pages/ReadingPage.tsx` and `Frontend/src/modules/pages/researcher/current-live/index.tsx`.

### What still needs stronger defense

- The thesis should make decision strategy boundaries more explicit than “intervention logic inside the main session manager/runtime”.
- The thesis should make intervention-module boundaries more explicit than “researcher UI can send a command”.
- The thesis should show that new strategies and interventions can be added additively, not by reopening core orchestration every time.

## Centralization: good and risky

### Why central orchestration is appropriate

- A single authoritative session model is useful for experiments because it keeps the participant view, researcher view, and exports aligned.
- It also simplifies reproducibility and replay generation.

### Why over-centralization is risky

- If every new decision strategy or intervention requires direct edits in `ExperimentSessionManager`, the architecture is not truly plug-and-play.
- The session manager should coordinate, not become the implementation site for every future experiment idea.

## Recommended architectural direction for thesis phases

### Phase direction 1: make the decision seam explicit

- Define a stable strategy contract with clear inputs, outputs, and provenance metadata.
- Manual decisions should use the same contract as future rule-based or AI-backed strategies.
- This is one of the cleanest ways to defend “support without implementing AI”.

### Phase direction 2: make intervention modules explicit

- Represent interventions as typed, additive modules with declared parameters and applicability.
- Ensure the participant reader applies results through a stable adaptation pipeline rather than ad hoc UI branching.

### Phase direction 3: preserve context as architectural behavior, not just UI polish

- Context preservation is core to the thesis research question.
- That means anchoring and flow preservation should be treated as a first-class architecture concern across intervention application, reader rendering, and logging.

### Phase direction 4: keep export/replay tied to the same authoritative model

- The strongest thesis defense comes from showing that experiment replay and export are generated from the same state transitions that drove the live session.
- The current export path already supports this and should remain tightly coupled to authoritative session events rather than reconstructed from partial logs.

## Architectural anti-patterns to avoid

- embedding strategy-specific logic directly in the researcher UI
- treating WebSocket message types as the architecture instead of as transport
- scattering session truth across frontend local state and backend orchestration
- making AI support depend on app-specific model code
- optimizing for production SaaS concerns before thesis experiment workflows are complete

## Architecture conclusion

The current repo already has the right macro-shape for the thesis: separate frontend/backend applications, explicit infrastructure adapters, and a backend-owned authoritative realtime session model. The architectural work that remains is not to replace that shape, but to sharpen its seams so interventions and decision strategies are demonstrably additive, swappable, and defensible under the thesis research questions.
