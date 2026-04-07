# External Decision Service Execution Plan

## Purpose

This document turns the external decision-service roadmap into an execution-ready checklist for implementation.

It assumes:

- one active external provider per session in v1
- a dedicated provider websocket boundary at `/ws/provider`
- localhost-first deployment for the first mock Python service
- backend authority remains final for proposal lifecycle, intervention validation, and intervention application

This plan is intended to be detailed enough that the next implementation step can begin without redesigning the architecture again.

## Target End State

At the end of this work, the system should support:

- a separate provider actor with its own realtime contract
- provider authentication and registration
- provider health tracking and timeout handling
- advisory and autonomous provider flows
- safe fallback to manual or researcher-controlled behavior
- backend-owned authoritative provider status in session state
- exportable provenance for provider proposals and applied interventions
- a stable contract that a mock Python service can consume next

## Architectural Defaults To Lock Before Implementation

- Transport boundary: `/ws/provider`
- Protocol style: versioned JSON envelopes
- Auth model for v1: shared secret token in provider handshake
- Active provider policy: exactly one active provider per session
- Provider authority: never final; backend validates and applies
- Fallback policy: disconnect or timeout disables external automation and preserves researcher control

## Phase 1: Provider Protocol And Actor Separation

### Goal

Define the public provider contract and separate provider semantics from the browser websocket contract before implementing transport behavior.

### Concrete changes

- Add a dedicated provider protocol document under `docs/backend/`.
- Define a provider envelope shape with:
  - `type`
  - `protocolVersion`
  - `providerId`
  - `sessionId`
  - `correlationId`
  - `sentAtUnixMs`
  - `payload`
- Define inbound provider messages:
  - `providerHello`
  - `providerHeartbeat`
  - `providerSubmitProposal`
  - `providerRequestAutonomousApply`
  - `providerError`
- Define outbound server messages:
  - `providerWelcome`
  - `providerSessionSnapshot`
  - `providerSessionStateChanged`
  - `providerGazeSample`
  - `providerReadingFocusChanged`
  - `providerViewportChanged`
  - `providerAttentionSummaryChanged`
  - `providerInterventionEvent`
  - `providerDecisionModeChanged`
  - `providerStatusChanged`
  - `providerError`
- Define actor rules:
  - browser `/ws` cannot send provider messages
  - provider `/ws/provider` cannot send participant or researcher commands
- Define proposal semantics:
  - advisory submits a pending proposal
  - autonomous submits a request for validated auto-application

### Likely files to update

- [MessageTypes.cs](C:/Users/s243872/Desktop/reading-the-reader-monorepo/Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Messaging/MessageTypes.cs)
- [RealtimeIngressCommands.cs](C:/Users/s243872/Desktop/reading-the-reader-monorepo/Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Messaging/RealtimeIngressCommands.cs)
- new protocol doc in [docs/backend](C:/Users/s243872/Desktop/reading-the-reader-monorepo/docs/backend)

### Likely symbols/classes to add

- `ProviderMessageTypes`
- `ProviderProtocolVersions`
- `ProviderHelloPayload`
- `ProviderHeartbeatPayload`
- `ProviderSubmitProposalPayload`
- `ProviderRequestAutonomousApplyPayload`
- `ProviderEnvelope<T>`
- `ProviderCommandFactory`
- `IProviderIngressCommand`

### Acceptance criteria

- The provider contract is written and versioned.
- Every provider message type has a defined direction, payload shape, and lifecycle meaning.
- Actor boundaries are explicit and documented.
- No implementation begins with unresolved protocol questions.

### Test slice

- Add parsing/characterization tests for provider envelopes.
- Add tests that browser messages are rejected on the provider boundary and provider messages are rejected on the browser boundary.

## Phase 2: Dedicated Provider Transport And Registration

### Goal

Implement `/ws/provider` as a dedicated transport with registration, authentication, capability declaration, and connection tracking.

### Concrete changes

- Add `/ws/provider` to the backend host.
- Add dedicated websocket handling for provider clients.
- Add handshake validation using a shared secret from backend configuration.
- Record provider identity and capabilities after successful hello.
- Track:
  - connection state
  - provider id
  - display name
  - protocol version
  - advisory/autonomous support
  - supported intervention module ids
  - last heartbeat
  - last error

### Likely files to update

- [Program.cs](C:/Users/s243872/Desktop/reading-the-reader-monorepo/Backend/src/ReadingTheReader.WebApi/Program.cs)
- [WebSocketConfiguration.cs](C:/Users/s243872/Desktop/reading-the-reader-monorepo/Backend/src/ReadingTheReader.WebApi/Websockets/WebSocketConfiguration.cs)
- [ApplicationModuleInstaller.cs](C:/Users/s243872/Desktop/reading-the-reader-monorepo/Backend/src/core/ReadingTheReader.core.Application/ApplicationModuleInstaller.cs)
- [appsettings.json](C:/Users/s243872/Desktop/reading-the-reader-monorepo/Backend/src/ReadingTheReader.WebApi/appsettings.json)
- [appsettings.Development.json](C:/Users/s243872/Desktop/reading-the-reader-monorepo/Backend/src/ReadingTheReader.WebApi/appsettings.Development.json)

### Likely new files

- `Backend/src/ReadingTheReader.WebApi/Websockets/ProviderWebSocketConfiguration.cs`
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Providers/ProviderConnectionRegistry.cs`
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Providers/IProviderConnectionRegistry.cs`
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Providers/ProviderIngressService.cs`
- `Backend/src/infrastructure/ReadingTheReader.RealtimeMessenger/ProviderWebSocketConnectionManager.cs`

### Likely symbols/classes to add

- `ExternalProviderOptions`
- `ProviderCapabilityDescriptor`
- `ProviderConnectionRecord`
- `ProviderConnectionStatus`
- `ProviderHandshakeValidator`
- `ProviderHelloRealtimeCommand`
- `ProviderHeartbeatRealtimeCommand`
- `ProviderDisconnectRealtimeCommand`

### Acceptance criteria

- `/ws/provider` accepts only provider protocol messages.
- A provider cannot become active without a valid hello handshake.
- Invalid token, unsupported protocol version, or duplicate provider registration is rejected cleanly.
- Provider connection state is stored in one authoritative backend service.

### Test slice

- Auth success and auth failure
- Unsupported protocol version
- Duplicate provider id
- Heartbeat updates connection freshness
- Disconnect removes provider state cleanly

## Phase 3: Real External Provider Gateway

### Goal

Replace the current external no-op strategy with a real gateway that communicates with the active external provider.

### Concrete changes

- Remove stub-only behavior from the `external` decision path.
- Introduce an application-facing gateway that can:
  - check whether an active provider is available
  - send the right decision input events to that provider
  - await proposal or autonomous apply responses
  - reject stale or timed-out responses
- Keep `ExperimentSessionManager` as the final authority for:
  - proposal lifecycle
  - guardrails
  - application of interventions

### Likely files to update

- [ExternalDecisionStrategyStub.cs](C:/Users/s243872/Desktop/reading-the-reader-monorepo/Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Decisioning/ExternalDecisionStrategyStub.cs)
- [DecisionStrategyCoordinator.cs](C:/Users/s243872/Desktop/reading-the-reader-monorepo/Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Decisioning/DecisionStrategyCoordinator.cs)
- [ExperimentSessionManager.cs](C:/Users/s243872/Desktop/reading-the-reader-monorepo/Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Session/ExperimentSessionManager.cs)
- [IExperimentRuntimeAuthority.cs](C:/Users/s243872/Desktop/reading-the-reader-monorepo/Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Session/IExperimentRuntimeAuthority.cs)

### Likely new files

- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Providers/IExternalDecisionProviderGateway.cs`
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Providers/ExternalDecisionProviderGateway.cs`
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Providers/ProviderProposalRouter.cs`

### Likely symbols/classes to add

- `ProviderDecisionRequest`
- `ProviderDecisionResponse`
- `ProviderProposalSubmission`
- `ProviderAutonomousApplyRequest`
- `ProviderRequestTimeoutPolicy`
- `ProviderProposalValidationResult`

### Acceptance criteria

- Selecting `external` no longer results in guaranteed `null`.
- Advisory mode creates backend-owned pending proposals from provider submissions.
- Autonomous mode still routes through backend validation before any intervention is applied.
- Timed-out, duplicated, or stale provider responses are rejected safely.

### Test slice

- Advisory provider proposal becomes active pending proposal
- Autonomous provider request becomes applied only when execution mode allows it
- Stale session id is rejected
- Timed-out response is rejected
- Duplicate correlation id does not create duplicate proposals

## Phase 4: Provider Input Projection And Backend Authority

### Goal

Make provider-relevant decision inputs backend-authoritative and streamable, instead of relying on browser-only derived state as the main contract.

### Concrete changes

- Keep raw gaze samples available to the provider.
- Project provider-relevant session data from backend state into dedicated provider outbound messages.
- Decide which derived signals remain acceptable as browser-originated temporary inputs and which must move to backend ownership.
- Move decision-critical summaries to backend-owned computation where practical, especially if they are required by both internal and external strategies.

### Likely files to update

- [DecisionContextSnapshot.cs](C:/Users/s243872/Desktop/reading-the-reader-monorepo/Backend/src/core/ReadingTheReader.core.Domain/Decisioning/DecisionContextSnapshot.cs)
- [ExperimentSessionSnapshot.cs](C:/Users/s243872/Desktop/reading-the-reader-monorepo/Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Session/ExperimentSessionSnapshot.cs)
- [ExperimentSessionManager.cs](C:/Users/s243872/Desktop/reading-the-reader-monorepo/Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Session/ExperimentSessionManager.cs)
- [current-live/index.tsx](C:/Users/s243872/Desktop/reading-the-reader-monorepo/Frontend/src/modules/pages/researcher/current-live/index.tsx)
- [ReadingPage.tsx](C:/Users/s243872/Desktop/reading-the-reader-monorepo/Frontend/src/modules/pages/reading/pages/ReadingPage.tsx)

### Likely new files

- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Providers/ProviderSessionProjection.cs`
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Providers/ProviderSessionProjectionFactory.cs`
- `Backend/src/core/ReadingTheReader.core.Domain/Decisioning/ProviderStatusSnapshot.cs`

### Likely symbols/classes to add

- `ProviderSessionSnapshot`
- `ProviderGazeSampleEnvelope`
- `ProviderReadingSignalSnapshot`
- `ProviderDecisionInputSnapshot`

### Acceptance criteria

- The provider can receive all required decision inputs from backend-owned state and streams.
- Decision-critical provider inputs no longer depend on a researcher browser timer to exist.
- The browser may still enhance UI, but not define the core external decision contract.

### Test slice

- Provider snapshot projection includes the required session fields
- Raw gaze stream reaches provider subscribers
- Provider decision flow still works when no researcher UI is connected

## Phase 5: Resilience, Timeout, And Fallback Policy

### Goal

Make provider failure safe and predictable.

### Concrete changes

- Add heartbeat timeout rules.
- Add stale provider detection.
- Disable external autonomous behavior automatically when provider freshness is lost.
- Preserve researcher manual control during provider failure.
- Add bounded buffering or explicit drop behavior so a slow provider cannot block session flow.

### Likely files to update

- [ExperimentSessionManager.cs](C:/Users/s243872/Desktop/reading-the-reader-monorepo/Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Session/ExperimentSessionManager.cs)
- provider registry and gateway files from Phases 2 and 3

### Likely symbols/classes to add

- `ProviderHealthPolicy`
- `ProviderHeartbeatMonitor`
- `ProviderFreshnessEvaluator`
- `ProviderFallbackPolicy`
- `ProviderBackpressureMode`

### Acceptance criteria

- Provider disconnect does not stop the experiment session automatically.
- Provider timeout disables external automation and surfaces degraded state.
- Researcher can still apply manual interventions after provider failure.
- Slow provider behavior does not block gaze ingestion or normal researcher control.

### Test slice

- Disconnect during session
- Heartbeat expiry during session
- Autonomous request rejected after timeout
- Manual intervention still succeeds during degraded provider state

## Phase 6: Researcher Visibility And Session Projection

### Goal

Expose provider health and availability in the authoritative session snapshot and researcher UI.

### Concrete changes

- Extend the session snapshot with provider status.
- Surface provider state in the researcher current-live page.
- Show at minimum:
  - provider connected status
  - active provider id
  - execution capability
  - last heartbeat
  - degraded or stale state
  - last provider error

### Likely files to update

- [ExperimentSessionSnapshot.cs](C:/Users/s243872/Desktop/reading-the-reader-monorepo/Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Session/ExperimentSessionSnapshot.cs)
- [experiment-session.ts](C:/Users/s243872/Desktop/reading-the-reader-monorepo/Frontend/src/lib/experiment-session.ts)
- [gaze-socket.ts](C:/Users/s243872/Desktop/reading-the-reader-monorepo/Frontend/src/lib/gaze-socket.ts)
- [LiveControlsColumn.tsx](C:/Users/s243872/Desktop/reading-the-reader-monorepo/Frontend/src/modules/pages/researcher/current-live/components/LiveControlsColumn.tsx)
- [LiveMetadataColumn.tsx](C:/Users/s243872/Desktop/reading-the-reader-monorepo/Frontend/src/modules/pages/researcher/current-live/components/LiveMetadataColumn.tsx)

### Likely symbols/classes to add

- `ProviderStatusSnapshot`
- `ProviderCapabilitySnapshot`
- `ProviderHealthState`
- `ProviderUiStatusBadge`

### Acceptance criteria

- Researcher UI shows whether the provider is healthy enough for advisory or autonomous behavior.
- Researcher can see provider degradation without opening logs.
- Session snapshot remains the authoritative source for provider state.

### Test slice

- Backend status transitions project into the session snapshot
- Frontend session mapping handles provider status updates
- UI shows degraded status when heartbeat expires

## Phase 7: Export, Provenance, And Replay Integrity

### Goal

Make provider-originated decisions fully reproducible in replay/export data.

### Concrete changes

- Extend replay/export schema to preserve:
  - provider id
  - proposal id
  - correlation id
  - rationale
  - execution mode
  - provider timestamps
  - final resolution
  - applied intervention linkage
- Ensure rejected, superseded, approved, and auto-applied provider proposals are all reconstructable.

### Likely files to update

- [ExperimentReplayExport.cs](C:/Users/s243872/Desktop/reading-the-reader-monorepo/Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Replay/ExperimentReplayExport.cs)
- [ExperimentReplayExportSerializer.cs](C:/Users/s243872/Desktop/reading-the-reader-monorepo/Backend/src/infrastructure/ReadingTheReader.Realtime.Persistence/ExperimentReplayExportSerializer.cs)
- [ExperimentReplayExportSerializerTests.cs](C:/Users/s243872/Desktop/reading-the-reader-monorepo/Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ExperimentReplayExportSerializerTests.cs)

### Likely symbols/classes to add

- `ProviderProposalEventRecord`
- `ProviderLifecycleEventRecord`
- `ProviderReplayMetadata`

### Acceptance criteria

- Export contains enough information to explain what the provider proposed, when, why, and what the backend did with it.
- Replay/export data can distinguish provider suggestion from researcher override.

### Test slice

- Round-trip export preserves provider provenance
- Rejected provider proposal remains visible in replay data
- Auto-applied provider intervention links to the correct proposal

## Phase 8: Documentation And Mock-Service Readiness

### Goal

Freeze the contract and make the next Python mock implementation straightforward.

### Concrete changes

- Update backend architecture docs to mention the provider boundary.
- Add a dedicated integration guide for provider clients.
- Include:
  - auth flow
  - connect and hello flow
  - heartbeat expectations
  - message samples
  - advisory sequence
  - autonomous sequence
  - disconnect and fallback behavior

### Likely files to update

- [backend-architecture.md](C:/Users/s243872/Desktop/reading-the-reader-monorepo/docs/backend/backend-architecture.md)
- [frontend-backend-integration-guide.md](C:/Users/s243872/Desktop/reading-the-reader-monorepo/docs/backend/frontend-backend-integration-guide.md)
- new provider integration guide in [docs/backend](C:/Users/s243872/Desktop/reading-the-reader-monorepo/docs/backend)

### Acceptance criteria

- A new engineer can build the mock Python service from docs plus test fixtures.
- No critical provider behavior is left implicit.

### Test slice

- Add one end-to-end provider test client scenario in backend tests:
  - connect
  - hello
  - receive session and gaze events
  - submit proposal
  - approve or auto-apply
  - disconnect
  - verify fallback

## Recommended Implementation Order

Implementation should proceed in this order:

1. Phase 1
2. Phase 2
3. Phase 3
4. Phase 5
5. Phase 4
6. Phase 6
7. Phase 7
8. Phase 8

Reason:

- Phases 1 to 3 create the seam.
- Phase 5 makes the seam safe.
- Phase 4 strengthens backend authority over inputs.
- Phase 6 makes it operable for researchers.
- Phase 7 makes it reproducible.
- Phase 8 freezes the contract for the mock provider.

## Stop Gates Between Phases

Do not start the next phase until these gates pass:

- After Phase 1: protocol doc reviewed and frozen for v1
- After Phase 2: provider registration and auth tests passing
- After Phase 3: external provider no longer behaves as a guaranteed no-op
- After Phase 5: timeout and fallback behavior verified
- After Phase 6: researcher can see provider state
- After Phase 7: export provenance verified
- After Phase 8: mock-service guide is complete

## Definition Of Ready For The Python Mock

The backend is ready for the next step when:

- `/ws/provider` is implemented and documented
- provider hello and heartbeat are enforced
- the provider can receive authoritative session and gaze inputs
- the provider can submit advisory proposals
- the provider can request autonomous application, subject to backend validation
- disconnect and timeout degrade safely
- provider status is visible in the researcher UI
- exports preserve provider provenance

At that point, the Python mock service can be implemented against a stable contract instead of driving backend redesign.
