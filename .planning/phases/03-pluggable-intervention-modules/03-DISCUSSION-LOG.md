# Phase 3: Pluggable Intervention Modules - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-03-31T00:00:00Z
**Phase:** 03-pluggable-intervention-modules
**Mode:** Auto-advanced from Phase 2 at user request
**Areas discussed:** Module boundary and ownership, Module contract and metadata, Safety and applicability rules, Researcher and API surface, Extensibility posture

---

## Module Boundary and Ownership

| Option | Description | Selected |
|--------|-------------|----------|
| Keep one generic intervention runtime | Continue treating interventions as direct patch application with no explicit module boundary. | |
| Extract explicit intervention modules behind stable ids | Keep runtime authority central, but move intervention-specific behavior behind additive modules. | ✓ |
| Let the frontend define interventions | Drive intervention behavior from UI-specific controls and transport payloads. | |

**Auto choice:** Extract explicit intervention modules behind stable ids.
**Notes:** This matches the roadmap and thesis requirement that intervention behavior be additive and inspectable without turning `ExperimentSessionManager` into the implementation site for every intervention idea.

---

## Module Contract and Metadata

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal hidden contract | Modules are internal only and expose little metadata. | |
| Inspectable metadata and parameter declaration | Each module exposes identity, supported parameters, required inputs, and safe/default guidance. | ✓ |
| Free-form payloads per module | Each module defines ad hoc payloads without a consistent declaration model. | |

**Auto choice:** Inspectable metadata and parameter declaration.
**Notes:** This is the cleanest fit for `MOD-04` and for researcher-facing discoverability.

---

## Safety and Applicability Rules

| Option | Description | Selected |
|--------|-------------|----------|
| Caller-managed safety | Researchers and decision providers are expected to know when modules are safe. | |
| Module-declared guardrails validated by backend runtime | Applicability and parameter checks live with the module contract and are enforced by authoritative runtime logic. | ✓ |
| Frontend-only safety hints | The UI warns, but runtime does not enforce. | |

**Auto choice:** Module-declared guardrails validated by backend runtime.
**Notes:** This preserves thesis-defensible authority boundaries and avoids unsafe drift between manual and automated triggering paths.

---

## Researcher and API Surface

| Option | Description | Selected |
|--------|-------------|----------|
| Keep hardcoded per-control UI and bespoke transport shapes | Researcher controls stay special-cased by intervention type. | |
| Grouped UI backed by metadata-driven module references | UI can stay familiar, but it should map to stable module ids and parameter contracts. | ✓ |
| Pure registry UI with no grouping | Surface a raw module list directly to the researcher. | |

**Auto choice:** Grouped UI backed by metadata-driven module references.
**Notes:** This keeps the researcher workflow usable while still achieving a real module boundary.

---

## Extensibility Posture

| Option | Description | Selected |
|--------|-------------|----------|
| Invent new intervention types now | Use this phase to expand the experimental intervention catalog. | |
| Modularize the existing intervention surface first | Turn current presentation/appearance adaptations into the first module catalog before adding new behaviors. | ✓ |
| Delay module work and focus on context preservation first | Skip the explicit module boundary until later phases. | |

**Auto choice:** Modularize the existing intervention surface first.
**Notes:** This keeps Phase 3 aligned to the roadmap instead of bleeding into later behavior and reading-flow phases.

---

## the agent's Discretion

- Exact contract and registry type names.
- Exact grouping and presentation of modules in researcher-facing UI.
- The precise first-version catalog shape, as long as existing intervention capabilities become explicit modules.

## Deferred Ideas

- New intervention families beyond the current presentation and appearance controls.
- Deeper context-preservation behavior and flow instrumentation.

