# Architecture evidence (Phase B) — RQ1 / NFR1 / NFR6

Reproducible, data-independent evidence that the modular boundaries hold. Cited by the
Evaluation chapter (modularity section).

## B1 — Boundary inspection

### Project-reference DAG (assembly-level, build-enforced)
The .NET solution is split so the dependency direction only ever points inward toward the
core. A violating reference is a **compile error**, so the boundary is enforced by the build,
not by convention.

| Project | Layer | References (project) |
| --- | --- | --- |
| `ReadingTheReader.core.Domain` | Domain | *(none)* |
| `ReadingTheReader.core.Application` | Application (core, ports) | Domain only |
| `ReadingTheReader.Realtime.Persistence` | Infrastructure | Application |
| `ReadingTheReader.RealtimeMessenger` | Infrastructure | Application |
| `ReadingTheReader.TobiiEyetracker` | Infrastructure | Application, Domain |
| `ReadingTheReader.WebApi` | Host / transport | Application + all three infrastructure projects |

Direction: `Domain ← Application ← {Persistence, RealtimeMessenger, TobiiEyetracker} ← WebApi`.
The Application core depends on **no** infrastructure, transport, or web assembly; the Domain
depends on nothing. This is the ports-and-adapters arrangement the design claims.

### Executable architecture test
`Backend/tests/.../ArchitectureBoundaryTests.cs` encodes the rule as two xUnit facts:
- `Domain_depends_on_no_other_project_assembly`
- `Application_core_depends_on_no_infrastructure_or_transport_assembly`

They inspect `Assembly.GetReferencedAssemblies()` at runtime, so the modularity claim is
*verified*, not merely asserted, and any future violating reference fails the suite.
Status: **passing** (suite total 100/100).

## B2 — Modification locality

### In-process (adding a built-in module touches one location)
Adding an intervention module means adding one entry to
`BuiltInReadingInterventionModules.All` (often just a factory call using the
`SingleParameterReadingInterventionModule<T>` helper, so not even a new class). The installer
loops `All` and registers each behind `IReadingInterventionModule`; the registry resolves a
module by id and the runtime never names a concrete module. Consequently:

- **Files changed to add a module:** one (`BuiltInReadingInterventionModules.cs`).
- **Existing runtime / session-manager / other-module files changed:** zero.

The same registry-by-id pattern recurs for decision strategies and eye-movement-analysis
strategies (each resolved from its own registry behind an interface).

### Out-of-process (adding an external provider touches zero core files)
The three reference providers live entirely outside the backend solution as separate
processes that speak the documented module-provider protocol:
- `Decision-Maker/` (external decision provider)
- `Eye-Movement-Analyzer/` (external analysis provider)
- `reading-the-struggle/connector/` (a collaborator's real struggle-prediction model wrapped
  as a `fixation-analysis` provider — imported as-is and never modified)

**Headline evidence:** the struggle connector was added in commit `fb367fc`, which changed
**0 files under `Backend/`** (`git show --stat fb367fc -- Backend/` is empty). A third party's
model was integrated with no change to the core — the strongest available demonstration of the
external-provider contract's sufficiency (and the closest thing to independent validation,
since the contract was not designed around that model).

## B3 — Provider-integration runbook
All three providers connect over `/ws/module-provider` and register via `moduleProviderHello`:
- **Decision-Maker:** `Decision-Maker/` — run its module entry point; select the external
  decision strategy (advisory/autonomous) in the experiment stepper. Now echoes the backend
  correlation id so the decision RTT (A2) is measurable.
- **Eye-Movement-Analyzer:** `Eye-Movement-Analyzer/` — reference external analysis provider.
- **Struggle connector:** `reading-the-struggle/connector/` — `./scripts/startService.ps1`;
  select the external eye-movement-analysis source so the backend routes gaze to it.

Protocol conformance / rejection paths are exercised by the handshake smoke test in
`Experiments/module-provider-sample/` (unknown module, wrong secret, protocol mismatch, empty
hello), and the happy path by the three providers above.

The shared-secret must match the backend `ModuleProvider:SharedSecret` setting in each case.
