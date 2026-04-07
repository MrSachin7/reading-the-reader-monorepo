# External Decision Service Gap Analysis

## Purpose

This document reviews how ready the current architecture is for a localhost-first mock Python decision provider that consumes backend realtime data and decides when to propose or apply interventions.

It is planning-only. No code changes are proposed in this step.

The analysis compares two possible integration shapes:

1. Reuse the current `/ws` channel.
2. Introduce a dedicated provider-facing boundary.

The immediate target is a mock Python service running on the same machine as the backend, but the recommendation should remain defensible for future remote provider deployments.

## Evidence Base

Primary implementation evidence:

- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Session/ExperimentSessionManager.cs`
- `Backend/src/ReadingTheReader.WebApi/Websockets/WebSocketConfiguration.cs`
- `Frontend/src/lib/gaze-socket.ts`

Additional evidence used to support specific claims:

- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Decisioning/ExternalDecisionStrategyStub.cs:3-9`
- `Backend/src/core/ReadingTheReader.core.Domain/Decisioning/DecisionProviderIds.cs:3-7`
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Decisioning/DecisionStrategyRegistry.cs:40-52`
- `Frontend/src/modules/pages/experiment/components/experiment-stepper.tsx:203-209`
- `Backend/src/core/ReadingTheReader.core.Domain/Decisioning/DecisionContextSnapshot.cs:5-18`
- `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/DecisionContextFactoryTests.cs:70-82`
- `Backend/src/ReadingTheReader.WebApi/Program.cs:20-32`
- `Backend/src/ReadingTheReader.WebApi/Program.cs:62-70`
- `Backend/src/ReadingTheReader.WebApi/ExperimentSessionEndpoints/GetExperimentSessionEndpoint.cs:16-20`
- `Backend/src/ReadingTheReader.WebApi/InterventionModuleEndpoints/GetInterventionModulesEndpoint.cs:18-20`
- `Frontend/src/modules/pages/researcher/current-live/index.tsx:282-292`

## 1. Current Architecture That Already Supports Externalization

### Already supported

- `external` is already a first-class decision provider id in the backend vocabulary (`DecisionProviderIds.External`) and in the frontend experiment setup UI (`experiment-stepper.tsx:203-209`).
- The decision registry already exposes `External` as a provider descriptor that supports both advisory and autonomous execution (`DecisionStrategyRegistry.cs:49-52`).
- The frontend already lets a researcher select `External advisory` and `External autonomous` conditions (`experiment-stepper.tsx:207-208`).
- The backend already has a strong authority model centered on `ExperimentSessionManager`.
  - It owns the current session snapshot (`ExperimentSessionManager.cs:899-926`).
  - It owns intervention application (`ExperimentSessionManager.cs:347-396`).
  - It owns proposal evaluation and proposal lifecycle transitions (`ExperimentSessionManager.cs:608-696`).
- The backend already exposes reusable public read surfaces:
  - `GET /api/experiment-session` for the current authoritative snapshot (`GetExperimentSessionEndpoint.cs:18-19`).
  - `GET /api/intervention-modules` for intervention module descriptors (`GetInterventionModulesEndpoint.cs:19-20`).
- The current websocket protocol already includes useful control and review messages in `gaze-socket.ts`, including:
  - `subscribeGazeData`
  - `getExperimentState`
  - `applyIntervention`
  - `approveDecisionProposal`
  - `rejectDecisionProposal`
  - `pauseDecisionAutomation`
  - `resumeDecisionAutomation`
  - `setDecisionExecutionMode`
- Intervention and proposal payloads already preserve provenance in a useful way:
  - `ApplyInterventionCommand` contains `Source`, `Trigger`, and `Reason`.
  - `DecisionProposalSnapshot` carries `ProviderId`, `ExecutionMode`, `Signal`, `Rationale`, proposal timestamps, resolution source, and applied intervention linkage.
- The backend already broadcasts intervention and proposal updates to connected clients:
  - `decisionProposalChanged`
  - `interventionEvent`
  - `readingSessionChanged`

### Important caveat

- The architecture is only partially external-ready. It is ready for "another strategy exists" at the domain and UI vocabulary level, but not yet ready for "an outside process can safely and cleanly plug in".

## 2. Gap Analysis For Reuse Of The Current `/ws` Channel

### What this option means

The mock Python provider would connect to the existing `/ws` endpoint, subscribe to gaze data, read session state, and send proposal or intervention-related commands over the same realtime bus currently used by frontend clients.

### Already supported

- The websocket endpoint already exists and accepts arbitrary websocket clients at `/ws` (`WebSocketConfiguration.cs:39-47`).
- Gaze streaming already works as a subscriber model:
  - clients can subscribe via `subscribeGazeData` (`gaze-socket.ts:120`, `ExperimentSessionManager.cs:950-975`)
  - `ExperimentSessionManager` only pushes gaze samples to subscribed connections (`ExperimentSessionManager.cs:934-947`, `1081-1085`)
- Session state is already queryable over websocket via `getExperimentState` and over REST via `GET /api/experiment-session`.
- A provider could theoretically reuse existing intervention-related commands such as `applyIntervention`, `approveDecisionProposal`, and execution-mode changes because the current realtime ingress treats them as general commands rather than frontend-only commands (`RealtimeIngressCommands.cs`, `ExperimentCommandIngress.cs`).

### Missing and required for a mock

- There is no provider-specific registration or identity handshake.
  - All websocket clients are currently anonymous connections identified only by generated connection ids (`WebSocketConfiguration.cs:47`, `WebSocketConnectionManager`).
  - There is no `providerConnected`, `registerProvider`, or capability declaration message.
- There is no actor separation on the realtime bus.
  - The same ingress pipeline handles researcher-style commands, participant view messages, and generic control messages.
  - A provider would be indistinguishable from a browser client at the protocol level.
- There is no provider-specific decision submission message.
  - The current protocol supports direct intervention application and proposal approval or rejection, but not "provider proposes decision X with correlation Y and awaits review".
- There is no contract for provider capabilities.
  - The system cannot currently ask or record whether a provider supports advisory mode, autonomous mode, certain intervention modules, or specific input signals.
- There is no provider health or readiness model.
  - No handshake status.
  - No heartbeat.
  - No timeout.
  - No disconnect policy beyond generic socket cleanup (`WebSocketConfiguration.cs:87`).

### Missing but only required for production-hardening

- No schema versioning or protocol negotiation exists for provider-facing messages.
- No correlation ids or idempotency keys exist for proposal submission or command replay handling.
- No explicit backpressure strategy exists for a high-frequency provider consumer.
- No provider-specific observability exists for connection state, last heartbeat, last decision latency, or failure reason.

### Architectural risks of this option

- Weak isolation: the provider would inherit a frontend-oriented bus rather than a contract designed for provider semantics.
- Weak security story: the protocol does not distinguish participant, researcher, and provider roles.
- Mixed actor semantics: frontend UI messages and provider integration messages would live in one protocol without a stable separation.
- Weak thesis defensibility: this works as a prototype shortcut, but it does not clearly demonstrate a modular external-service seam.

## 3. Gap Analysis For A Dedicated Provider Boundary

### What this option means

Introduce a dedicated public boundary for external decision providers. This could still use websocket transport under the hood, but it would expose a provider-specific protocol rather than asking providers to behave like generic frontend clients.

### Already supported

- The domain model already gives a strong basis for a provider boundary:
  - decision providers are explicit
  - decision proposals are explicit
  - intervention commands are explicit
  - intervention module descriptors are explicit
- The backend already has an authoritative orchestrator that is the right place to remain the final authority over:
  - session state
  - proposal lifecycle
  - intervention guardrails
  - execution mode
- The existing public read surfaces can seed a provider-facing contract:
  - session snapshot
  - intervention module catalog
  - live gaze stream

### Missing and required for a mock

- A provider-specific public transport contract does not exist yet.
  - There is no provider registration envelope.
  - There are no provider-specific outbound event types.
  - There are no provider-specific inbound decision/proposal messages.
- A provider-facing role model does not exist.
  - The system needs to distinguish researcher, participant view, and external provider as different actors with different rights.
- A provider lifecycle model does not exist.
  - connect
  - authenticate or at least identify
  - advertise capabilities
  - receive session-scoped data
  - submit proposal or autonomous request
  - disconnect safely
- A provider fallback policy does not exist.
  - If the provider disappears during a session, the system should define how it falls back to manual or researcher-controlled behavior.
- Provider-facing status telemetry does not exist for the researcher interface.
  - The researcher should be able to tell whether the provider is connected, stale, paused, timing out, or degraded.

### Missing but only required for production-hardening

- Authentication and authorization mechanisms appropriate for remote providers.
- Protocol versioning and compatibility policy.
- Replay protection and idempotent command handling.
- Load shedding, bounded buffering, and richer performance instrumentation.

### Architectural strengths of this option

- Clearer modular seam.
- Better fit for the thesis goal of interchangeable external decision logic.
- Cleaner future support for non-Python providers.
- Easier to document and defend as a public integration contract.
- Easier to evolve without coupling provider changes to browser-facing protocol details.

### Architectural cost of this option

- More upfront design work.
- Some duplication or abstraction around transport contracts.
- More explicit lifecycle and permission modeling before implementation begins.

## 4. Core Cross-Cutting Gaps Regardless Of Boundary Choice

### Gap: The external provider implementation is only a stub

Status: Missing and required for mock.

Evidence:

- `ExternalDecisionStrategyStub` exists but always returns `null` (`ExternalDecisionStrategyStub.cs:3-9`).

Impact:

- The `external` provider currently exists only as a selectable label and registry entry, not as a working adapter to an outside service.

### Gap: No trust boundary exists today

Status: Missing and required for mock, even on localhost if the goal is a clean architecture.

Evidence:

- Authentication and authorization services are registered (`Program.cs:21-22`), but the main REST endpoints used for session and intervention metadata are explicitly anonymous (`GetExperimentSessionEndpoint.cs:18-19`, `GetInterventionModulesEndpoint.cs:19-20`).
- The websocket endpoint accepts connections and dispatches messages without any role model or auth check (`WebSocketConfiguration.cs:39-77`).

Impact:

- The system cannot distinguish whether a command came from a participant surface, researcher UI, or external provider.

### Gap: The internal decision context does not match the intended external-AI responsibility

Status: Missing and required for mock.

Evidence:

- `DecisionContextSnapshot` includes presentation, appearance, focus, attention summary, participant viewport, and recent interventions, but not raw gaze or the full experiment snapshot (`DecisionContextSnapshot.cs:5-18`).
- A test explicitly locks that omission in place by asserting that `LatestGazeSample` and other broader fields are not exposed (`DecisionContextFactoryTests.cs:70-82`).

Impact:

- This is a good internal abstraction for in-process strategies.
- It is not sufficient for an external service whose stated responsibility is to consume gaze streaming data itself.

### Gap: Important derived signals are frontend-originated

Status: Missing and required for mock if the provider is meant to be the decision engine rather than a browser-side helper.

Evidence:

- The researcher UI periodically publishes `updateReadingAttentionSummary(snapshot)` from frontend logic every 750 ms (`current-live/index.tsx:282-292`).

Impact:

- The current architecture relies on browser-produced derived attention summaries.
- That weakens backend authority over the sensing-to-decision pipeline and makes external providers depend on frontend behavior for some decision inputs.

### Gap: Docs are frontend-oriented, not provider-oriented

Status: Missing and required for mock.

Evidence:

- Existing backend docs describe frontend websocket usage and browser-style flows, but not a provider-facing protocol.

Impact:

- Another team cannot implement a clean external provider from documentation alone.
- This is especially important because the thesis explicitly argues for modular, swappable decision logic.

### Gap: No tests cover an external provider client path

Status: Missing and required for mock.

Evidence:

- Current tests cover decision contracts, decision context mapping, and internal proposal lifecycle, but not an outside provider connecting through a transport boundary.

Impact:

- The most important new architectural seam would be unverified.

## 5. Recommendation

### Recommended long-term direction

Favor a dedicated provider boundary.

Reasoning:

- It better matches the thesis argument for modularity and interchangeable decision providers.
- It produces a cleaner public contract.
- It avoids overloading the frontend websocket protocol with provider-specific semantics.
- It gives the clearest path to future remote or third-party providers.

### Recommended short-term prototype stance

If the team wants the fastest possible localhost mock, reusing the current `/ws` infrastructure is acceptable only as a prototype shortcut.

That shortcut should be documented as:

- an implementation convenience for the first mock
- not the target architecture
- not the final provider contract to be defended in the thesis

## 6. Interfaces To Define Later

These are the public concepts that should be defined before implementing the real external provider seam.

### Provider registration and identity

- `providerConnected` or equivalent handshake message
- provider id
- provider display name
- provider version
- supported execution modes
- supported intervention module ids
- protocol version

### Outbound messages from the system to the provider

- session lifecycle updates
- current session snapshot or provider-specific session summary
- gaze sample stream
- optional derived reading-state updates
  - participant viewport
  - reading focus
  - backend-owned attention summary if retained
- configuration changes
  - execution mode
  - automation pause state

### Inbound messages from the provider to the system

- decision proposal submission
- advisory response payload
- autonomous apply request
- provider error/status event
- heartbeat

### Provenance and correlation fields

- provider id
- proposal id
- session id
- correlation id
- provider timestamp
- server-received timestamp
- execution mode
- rationale
- signal summary or trigger summary

### Failure-mode rules

- provider unavailable before session start
- provider disconnect during session
- stale proposal submitted after state has moved on
- provider timeout
- researcher override
- fallback to manual mode
- fallback to advisory-only mode if autonomous execution becomes unsafe

## 7. Comparison Summary

| Option | Strengths | Weaknesses | Recommendation |
| --- | --- | --- | --- |
| Reuse current `/ws` | Fastest prototype, lowest immediate code churn, can reuse existing websocket plumbing | Poor actor isolation, weak security story, mixed protocol semantics, weak thesis defensibility | Accept only as a short-lived localhost prototype shortcut |
| Dedicated provider boundary | Clean modular seam, clearer public contract, easier future extensibility, stronger thesis story | More upfront design and protocol work | Recommended target architecture |

## 8. Future Validation Scenarios

Any later implementation should be validated against these scenarios:

- A local Python provider can connect, identify itself, and receive session lifecycle plus gaze stream.
- Advisory mode works end-to-end: provider submits a proposal, researcher approves or rejects it, and provenance is logged.
- Autonomous mode works end-to-end: provider request is accepted only when the configured execution mode allows it and intervention guardrails still pass.
- Provider disconnect or timeout degrades safely to manual or researcher-controlled operation.
- Session exports preserve proposal source, rationale, timestamps, and applied intervention linkage.
- Researcher-only and participant-only commands are not accidentally exposed to the provider actor.

## 9. Final Conclusion

The current codebase is not starting from zero. It already has good internal vocabulary for decision providers, intervention proposals, execution modes, and authoritative session orchestration. That is a strong foundation.

The main gap is not "how do we add AI logic?" The main gap is "how do we expose a clean public boundary for an external process without collapsing researcher, participant, and provider responsibilities into one anonymous websocket channel?"

For that reason:

- the architecture is partially ready for externalization
- the current `/ws` channel is enough for a fast mock only
- a dedicated provider-facing boundary is the correct long-term direction

That recommendation best supports both the immediate mock-Python goal and the thesis requirement for a defendable, modular architecture.
