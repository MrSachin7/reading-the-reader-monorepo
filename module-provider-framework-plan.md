# Module Provider Framework — Implementation Plan

## Why

The thesis argues for "swappable decision and intervention logic" and a "black-box module boundary" (see `DocsSite/app/system-design/architecture-proposal/page.mdx` and `DocsSite/app/integration/black-box-contract/page.mdx`). Today that argument is only realized for **one** module — the intervention provider — with a near-duplicate copy for the fixation/saccade analysis provider. Adding a third (facial state) the same way would mean three copies of the same WebSocket-endpoint-plus-registry-plus-ingress code.

This plan replaces that duplication with a single generic **module provider framework**. Any module in the system (sensing, decision, analysis, intervention rendering) can opt in by declaring its inputs and outputs; the framework handles connection, handshake, heartbeat, routing, and lifecycle. External teams can ship better implementations of any module without touching the core.

This is the thesis-defining architectural contribution.

## Decisions (locked)

| Decision | Choice |
|---|---|
| Active providers per module | **One** at a time. Matches current intervention/analysis behavior. Simpler to reason about. |
| Modules per connection | **Many**. One external process can serve multiple modules over a single WebSocket. |
| Transport | **One** WebSocket endpoint: `/ws/module-provider`. Routing key in envelope is `moduleId`. |
| Built-in fallback | Per-module **coordinator** picks built-in vs external. When external disconnects, built-in resumes automatically. |
| Capabilities schema | Per-module typed capabilities, surfaced through `IModuleDefinition.Capabilities`. |
| Heartbeat | Single global default in `ModuleProviderOptions`, overridable per module. |
| Schema versioning | Each module owns its `ProtocolVersion`. Framework enforces match at hello. |

## Architecture Shape

```
External Process (any language)
        │
        │ WebSocket
        ▼
/ws/module-provider                       ← single endpoint
        │
        ▼
ModuleProviderWebSocketConfiguration      ← parses envelope, routes by moduleId
        │
        ▼
ModuleProviderIngressService              ← looks up registered handler for moduleId
        │
        ├─→ FacialStateInboundHandler ─→ FacialStateService ─→ ExperimentSessionManager
        ├─→ InterventionsInboundHandler ─→ ExperimentRuntimeAuthority
        └─→ FixationAnalysisInboundHandler ─→ ExperimentRuntimeAuthority

Outbound (backend → provider):
ModuleProviderGateway<TModule>            ← typed wrapper per module
        │
        ▼
IModuleProviderTransportAdapter           ← single transport
        │
        ▼
ModuleProviderRealtimeMessenger           ← sends envelope over WebSocket
```

## Phases

Each phase ends with the system in a working state. You can pause between any of them.

### Phase 1 — Module abstraction (no transport, no behavior change)

**Goal:** define what a "module" is in code, with zero impact on running behavior.

**New files in** `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Modules/`:
- `IModuleDefinition.cs` — `ModuleId`, `DisplayName`, `ProtocolVersion`, inbound/outbound message types, `Capabilities` ✅
- `IModuleInboundHandler.cs` — `ValueTask HandleAsync(string messageType, string payloadJson, ModuleProviderContext ctx, CancellationToken ct)` ✅
- `IModuleProviderCoordinator.cs` — built-in vs external arbitration via `IsExternalActive` + `SourceChanged` event ✅
- `IModuleRegistry.cs` + `ModuleRegistry.cs` — startup-time registration, lookup by id, duplicate rejection ✅
- `ModuleProviderConnectionRecord.cs` (with `ModuleProviderConnectionErrorRecord`) ✅
- `ModuleProviderContext.cs` — connectionId, providerId, moduleId, sessionId, correlationId, receivedAtUnixMs ✅
- `ModuleCapabilities.cs` — string-keyed bag with `HasFlag` / `GetString` / `GetList` helpers ✅
- Envelope contracts in `Backend/src/core/.../Realtime/Messaging/ModuleProviderProtocol.cs`:
  - `ModuleProviderEnvelope<T>`, `ModuleProviderHelloPayload` + `ModuleProviderHelloModuleEntry`, `ModuleProviderWelcomePayload`, `ModuleProviderHeartbeatPayload`, `ModuleProviderErrorPayload`, `ModuleProviderInboundPayload`, `ModuleProviderOutboundPayload`
  - Plus `ModuleProviderProtocolVersions`, `ModuleProviderMessageTypes`, `ModuleProviderErrorCodes`, `ModuleProviderConnectionStatuses` ✅

**Design notes (decided during Phase 1):**
- `IModuleSource` marker interface was dropped. The coordinator's `IsExternalActive` + `SourceChanged` event give built-in sources everything they need to pause/resume; an extra marker interface added no value at this stage. Can be added in Phase 3 if DI discovery requires it.
- `IModuleInboundHandler` receives `string payloadJson` (not `object` or `JsonElement`) so the framework stays JSON-library-agnostic. Modules deserialize their own typed payloads.
- `ModuleProviderHelloPayload` carries `IReadOnlyList<ModuleProviderHelloModuleEntry>` — one provider connection declares multiple modules at once (Decision B from locked decisions).

**Stop point:** code compiles, framework exists, nothing uses it yet. Existing `/ws/provider` and `/ws/analysis-provider` untouched.

**Scope:** ~290 lines new across 9 files, 0 deleted. Build green: 0 warnings, 0 errors.

**Status:** [x] complete

---

### Phase 2 — Generic transport and one endpoint

**Goal:** stand up `/ws/module-provider` with handshake/heartbeat/dispatch. Old endpoints still operational.

**New:**
- `IModuleProviderTransportAdapter` (in `InfrastructureContracts/`) ✅
- `ModuleProviderOptions` — shared secret, default heartbeat timeout, per-module overrides ✅
- `IModuleProviderGateway` + `ModuleProviderGateway` — non-typed outbound publisher (typed wrappers come in later phases) ✅
- `ModuleProviderRegistrationResult` + `ModuleProviderHeartbeatResult` + `ModuleProviderRegistrationModuleRejection` ✅
- `IModuleProviderConnectionRegistry` + `ModuleProviderConnectionRegistry` — multi-module-per-connection, single-active-per-module, also implements `IModuleProviderCoordinator` ✅
- `IModuleProviderIngressService` + `ModuleProviderIngressService` — dispatches hello/heartbeat/inbound/error/disconnect ✅
- `ModuleProviderRealtimeMessenger` + `ModuleProviderWebSocketConnectionManager` (in `infrastructure/ReadingTheReader.RealtimeMessenger/`) ✅
- `ModuleProviderWebSocketConfiguration` — `/ws/module-provider` endpoint with envelope parsing + dispatch ✅
- `ModuleProviderFrameworkInstaller.InstallModuleProviderFramework(options)` — DI wiring ✅
- Sample test client in `Experiments/module-provider-sample/` (bun-compatible Node) with 4 handshake scenarios ✅

**Design notes (decided during Phase 2):**
- `ModuleProviderGateway` is non-generic for Phase 2; typed `ModuleProviderGateway<TModule>` wrappers are deferred to Phase 4+ when each module ships its outbound publisher. Avoids YAGNI in the framework.
- Heartbeat timeout sent in welcome is the `min` across all accepted modules — strictest module wins. Stops a slow module from giving cover to a fast one.
- Registry events (`SourceChanged`) fire **after** the lock is released, with try/catch around the invocation so a faulty subscriber can't break the registry.
- Inbound payloads are passed through to handlers as raw JSON `string` (not `JsonElement`) so the framework stays decoupled from `System.Text.Json` at the contract layer.
- One connection's failure path closes the connection. Per-module rejections during hello are returned alongside welcome — the provider gets accepted for what it could register and informed about what it couldn't.

**Stop point:** new endpoint accepts hello + auth + heartbeat. No modules registered yet, so unknown-module hello replies with error. Old `/ws/provider` and `/ws/analysis-provider` endpoints unchanged.

**Validation:** all 4 smoke-test scenarios pass against live backend on `ws://localhost:5190/ws/module-provider`:
- unknown module → `unknown-module` error
- bad auth → `auth-failed` error
- bad framework version → `protocol-mismatch` error
- no modules → `invalid-payload` error

**Scope:** ~830 lines new across 14 files, 0 deleted. Build green: 0 warnings, 0 errors.

**Status:** [x] complete

---

### Phase 3 — First module migrated: Facial State

**Goal:** prove the framework end-to-end on the smallest, newest module.

**New:**
- `FacialStateModuleDefinition` (in `Backend/src/core/.../Realtime/FacialState/`)
- `FacialStateInboundHandler` — handles `facialObservation`, `webcamStatus`, optional `gazeSample` messages
- `ExternalFacialStateAdapter : IFacialStateAdapter` — bridges generic ingress into the existing `IFacialStateAdapter` event surface
- `FacialStateProviderCoordinator` — when external is connected, OpenCV worker pauses; when it disconnects, OpenCV resumes
- Register in `WebcamModuleInstaller`

**Validation:**
- Sample Python script connects to `/ws/module-provider`, registers as `facial-state` provider, sends synthesized observations
- Researcher UI shows external provider's data instead of OpenCV's
- Disconnect → OpenCV resumes automatically, no manual intervention

**Stop point:** facial state has a real working external-provider story.

**Scope:** ~250 lines new, 0 deleted.

**Status:** [x] complete

---

### Phase 4 — Migrate intervention provider

**Goal:** existing intervention provider runs on the generic framework. Old `/ws/provider` endpoint kept alive in parallel for one phase.

**New:**
- `InterventionsModuleDefinition` (capabilities: `SupportsAdvisoryExecution`, `SupportsAutonomousExecution`, `SupportedInterventionModuleIds`)
- `InterventionsInboundHandler` — handles `submitProposal`, `requestAutonomousApply`, `providerError`
- `InterventionsOutboundPublisher` — typed wrapper around `ModuleProviderGateway` for session/gaze/decision-context/etc.
- Rewire `ExternalDecisionStrategy` to publish through the generic gateway

**Validation:** run existing Decision-Maker mock against `/ws/module-provider`. Verify identical behavior — proposals applied, autonomous apply gated by capability, heartbeats tracked, capability mismatch rejected cleanly.

**Stop point:** intervention provider works on both endpoints. Cut over test clients to the new endpoint.

**Design notes (decided during Phase 4):**
- `ExternalDecisionStrategy` and `ExperimentSessionManager` untouched. A `CompositeInterventionProviderGateway` (in `InterventionsOutboundPublisher.cs`) implements `IExternalProviderGateway` and fans out to both `ExternalProviderGateway` (legacy `/ws/provider`) and `InterventionsOutboundPublisher` (new framework). Registered as the `IExternalProviderGateway` singleton.
- `ModuleProviderConnectionRecord` extended with `IReadOnlyDictionary<string, ModuleCapabilities>? CapabilitiesByModule` (populated from hello payload). `GetModuleCapabilities(moduleId)` helper added. `ModuleProviderConnectionRegistry.Register()` populates it.
- `InterventionsInboundHandler` reads capabilities via `IModuleProviderCoordinator.GetActiveProvider()` and sends error messages back via `IModuleProviderGateway`.

**Scope:** ~350 lines new across 4 files, 2 files modified (registry + record), 1 file modified (installer).

**Status:** [x] complete

---

### Phase 5 — Migrate fixation/saccade analysis provider

**Goal:** same as Phase 4 for analysis.

**New:**
- `FixationAnalysisModuleDefinition`
- `FixationAnalysisInboundHandler` — handles `submitAnalysis`
- `FixationAnalysisOutboundPublisher`
- Rewire `ExternalEyeMovementAnalysisStrategy`

**Validation:** Eye-Movement-Analyzer mock works through `/ws/module-provider`. Identical fixation/saccade behavior.

**Stop point:** all three modules running on the generic framework. Old endpoints alive but unused.

**Design notes (decided during Phase 5):**
- Same composite gateway pattern as Phase 4: `CompositeAnalysisProviderGateway : IAnalysisProviderGateway` fans out to both `AnalysisProviderGateway` (legacy `/ws/analysis-provider`) and `FixationAnalysisOutboundPublisher` (new framework). `ExternalEyeMovementAnalysisStrategy` and `ExperimentSessionManager` untouched.
- `FixationAnalysisInboundHandler` handles `submitAnalysis` → `ApplyExternalEyeMovementAnalysisAsync()` and sends typed error responses back via the gateway.
- No capability keys needed for this module (no advisory/autonomous distinction).

**Scope:** ~230 lines new across 4 files, 1 file modified (installer).

**Status:** [x] complete

---

### Phase 6 — Cleanup and docs

**Goal:** delete the duplication and write the thesis-defensible documentation.

**Delete:**
- `ProviderConnectionRegistry`, `AnalysisProviderConnectionRegistry`
- `ProviderIngressService`, `AnalysisProviderIngressService`
- `ExternalProviderGateway`, `AnalysisProviderGateway`
- `IExternalProviderTransportAdapter`, `IExternalAnalysisProviderTransportAdapter`
- `ExternalProviderRealtimeMessenger`, `ExternalAnalysisProviderRealtimeMessenger`
- `ProviderWebSocketConfiguration`, `AnalysisProviderWebSocketConfiguration`
- `ProviderWebSocketConnectionManager`, `AnalysisProviderWebSocketConnectionManager`
- `ProviderRealtimeProtocol.cs`, `AnalysisProviderRealtimeProtocol.cs`
- `ProviderIngressCommands.cs`, `AnalysisProviderIngressCommands.cs`

**Update:**
- `Program.cs` — remove old WebSocket endpoint wiring
- `DocsSite/app/system-design/architecture-proposal/page.mdx` — add module-provider section
- `DocsSite/app/integration/external-provider-roadmap/page.mdx` — supersede with generalized roadmap
- `DocsSite/app/integration/black-box-contract/page.mdx` — generalize from "AI decisions" to "any module"

**New docs:**
- `DocsSite/app/system-design/module-provider-framework/page.mdx` — the thesis-defensible architecture writeup
- `DocsSite/app/integration/adding-a-new-module/page.mdx` — practical guide for external integrators

**Stop point:** one transport, one ingress, one registry, one endpoint. Three modules using it. ~1,200 lines deleted.

**Scope:** ~200 lines doc new, ~1,200 lines deleted.

**Status:** [x] complete

---

## Net Outcome

| Before | After |
|---|---|
| 2 WebSocket endpoints | 1 endpoint |
| 2 connection registries | 1 registry |
| 2 ingress services | 1 ingress |
| 2 transport adapters | 1 transport |
| 2 protocol files | 1 generic envelope + per-module schemas |
| Adding a module = ~1,200 lines of plumbing | Adding a module = ~250 lines of module-specific code |

Total LOC delta across all phases: **+1,850 new**, **−1,200 deleted**, **net +650** for the framework while delivering three working external-provider stories instead of one.

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Intervention provider has rich semantics (advisory/autonomous, capability checks) that don't generalize cleanly | Capabilities are per-module typed records; framework treats them opaquely. Module's inbound handler enforces its own capability rules. |
| Outbound message types differ wildly per module | Generic gateway publishes `(moduleId, messageType, payload)`. Each module ships a typed `OutboundPublisher` wrapper. |
| Heartbeat timeouts may need to differ per module | `ModuleProviderOptions` supports per-module overrides; default applied when not set. |
| Schema versioning drift between framework and modules | Each module owns its `ProtocolVersion`; framework validates at hello and rejects mismatches. |
| Long parallel-endpoints phase risks bugs | Phases 4–5 explicitly keep old endpoints alive; cutover is per-mock and reversible. |

## Test Strategy

- **Phase 1:** unit tests for `ModuleRegistry` (register, lookup, duplicate-id rejection).
- **Phase 2:** integration test — sample client connects, completes hello with unknown module → receives `unknown-module` error; with known module → receives welcome.
- **Phase 3:** end-to-end — Python `mediapipe` client connects, sends `facialObservation` messages, researcher UI reflects external data. Disconnect → OpenCV resumes within heartbeat-timeout window.
- **Phase 4:** Decision-Maker mock runs entire experiment against `/ws/module-provider`, all existing scenarios pass.
- **Phase 5:** Eye-Movement-Analyzer mock runs entire experiment, fixation/saccade output identical to legacy path.
- **Phase 6:** smoke test — three modules connected simultaneously via one provider connection, all routing correct, all isolation preserved.

## Tracking

Update the `Status:` line of each phase as it progresses:
- `[ ] not started` → `[~] in progress` → `[x] complete`

Mark blockers inline under the phase with `**BLOCKED:**` and a one-line reason.
