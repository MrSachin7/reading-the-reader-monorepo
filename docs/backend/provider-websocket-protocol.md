# Provider WebSocket Protocol

## Purpose

This document defines the v1 public protocol for external decision providers.

It is intended for provider clients such as a future mock Python service. It does not replace the browser-facing realtime contract on `/ws`.

## Boundary

- Browser and frontend clients continue to use `/ws`.
- External decision providers use `/ws/provider`.
- These are separate actor boundaries and must not reuse each other's message sets.

This separation is intentional:

- browser clients handle participant, researcher, and UI synchronization concerns
- provider clients handle external decision-provider concerns

## Protocol Version

- Current version: `provider.v1`
- Clients must send the protocol version during `providerHello`
- Unsupported protocol versions should be rejected during handshake

## Envelope Shape

Every provider message uses the same top-level JSON shape:

```json
{
  "type": "providerHello",
  "protocolVersion": "provider.v1",
  "providerId": "mock-python",
  "sessionId": null,
  "correlationId": null,
  "sentAtUnixMs": 1710000000000,
  "payload": {}
}
```

### Envelope fields

- `type`: required message type
- `protocolVersion`: required protocol version string
- `providerId`: provider identity when available
- `sessionId`: active session identifier when relevant
- `correlationId`: request/proposal correlation id when relevant
- `sentAtUnixMs`: sender timestamp when available
- `payload`: message-specific body

## Provider -> Server Messages

### `providerHello`

Sent immediately after connecting.

Purpose:

- identify the provider
- declare capabilities
- present the provider auth token

For `provider.v1`, `authToken` is a shared secret configured on the backend.

Payload:

```json
{
  "providerId": "mock-python",
  "displayName": "Mock Python Provider",
  "protocolVersion": "provider.v1",
  "authToken": "local-dev-token",
  "supportsAdvisoryExecution": true,
  "supportsAutonomousExecution": true,
  "supportedInterventionModuleIds": ["font-size", "line-height"]
}
```

### `providerHeartbeat`

Sent periodically by the provider after registration succeeds.

Purpose:

- prove liveness
- refresh provider freshness status

The backend uses heartbeat messages to keep provider registration fresh. Missing heartbeats are handled in later phases as degraded or disconnected provider state.

Payload:

```json
{
  "providerId": "mock-python",
  "protocolVersion": "provider.v1",
  "sentAtUnixMs": 1710000005000
}
```

### `providerSubmitProposal`

Sent when the provider wants the backend to create or update an advisory proposal.

Purpose:

- submit a provider-authored proposal that remains backend-owned after receipt

Payload:

```json
{
  "providerId": "mock-python",
  "sessionId": "session-42",
  "correlationId": "corr-1001",
  "proposalId": "proposal-7",
  "executionMode": "advisory",
  "rationale": "Sustained fixation suggests a small font-size increase.",
  "signalSummary": "token dwell time > 1200 ms",
  "providerObservedAtUnixMs": 1710000001234,
  "proposedIntervention": {
    "moduleId": "font-size",
    "trigger": "attention-summary",
    "reason": "Increase font size to reduce strain.",
    "presentation": {
      "fontFamily": null,
      "fontSizePx": 20,
      "lineWidthPx": null,
      "lineHeight": null,
      "letterSpacingEm": null,
      "editableByResearcher": null
    },
    "appearance": {
      "themeMode": null,
      "palette": null,
      "appFont": null
    },
    "parameters": {
      "fontSizePx": "20"
    }
  }
}
```

### `providerRequestAutonomousApply`

Sent when the provider asks the backend to perform an autonomous application path.

Purpose:

- request autonomous execution
- still require backend validation before applying

Payload:

```json
{
  "providerId": "mock-python",
  "sessionId": "session-42",
  "correlationId": "corr-1002",
  "executionMode": "autonomous",
  "rationale": "The current session is in autonomous mode and matches the provider rule.",
  "signalSummary": "token dwell time > 1200 ms",
  "providerObservedAtUnixMs": 1710000002234,
  "requestedIntervention": {
    "moduleId": "font-size",
    "trigger": "attention-summary",
    "reason": "Increase font size to reduce strain.",
    "presentation": {
      "fontFamily": null,
      "fontSizePx": 20,
      "lineWidthPx": null,
      "lineHeight": null,
      "letterSpacingEm": null,
      "editableByResearcher": null
    },
    "appearance": {
      "themeMode": null,
      "palette": null,
      "appFont": null
    },
    "parameters": {
      "fontSizePx": "20"
    }
  }
}
```

### `providerError`

Sent when the provider wants to surface a provider-local failure or degraded state.

Purpose:

- expose provider-local errors to backend diagnostics and researcher UI

Payload:

```json
{
  "providerId": "mock-python",
  "code": "inference-timeout",
  "message": "The provider exceeded its local inference timeout.",
  "detail": "Falling back to advisory-only behavior."
}
```

## Server -> Provider Messages

### `providerWelcome`

Sent after a successful `providerHello`.

Purpose:

- confirm registration
- confirm accepted protocol version
- indicate whether the provider is active

### `providerSessionSnapshot`

Sent after registration and whenever a full provider-facing refresh is required.

Purpose:

- provide the current authoritative session state required by the provider

### `providerSessionStateChanged`

Sent when authoritative session state changes in a way relevant to decisioning.

Purpose:

- keep provider-side state synchronized without resending the full snapshot every time

### `providerDecisionContext`

Sent when the backend evaluates the external decision path and wants to expose the current decision context to the provider.

Purpose:

- give the provider a session-scoped decisioning snapshot it can answer with `providerSubmitProposal` or `providerRequestAutonomousApply`
- preserve the current `sessionId` on the envelope for provider replies

### `providerGazeSample`

Sent for realtime gaze data intended for external decisioning.

Purpose:

- expose backend-owned gaze stream to the provider

### `providerReadingFocusChanged`

Sent when backend-authoritative reading focus changes.

### `providerViewportChanged`

Sent when backend-authoritative participant viewport changes.

### `providerAttentionSummaryChanged`

Sent when backend-owned attention summary changes.

This message should be treated as optional until the backend fully owns all decision-critical derived reading signals.

### `providerInterventionEvent`

Sent when an intervention is applied or recorded in authoritative session history.

### `providerDecisionModeChanged`

Sent when decision provider configuration, automation pause state, or execution mode changes.

### `providerStatusChanged`

Sent when the provider should be informed about its active, degraded, or superseded status.

## Actor Rules

### Browser boundary rules

The browser `/ws` boundary:

- may use browser message types only
- must reject provider message types

Examples of browser-only concerns:

- `subscribeGazeData`
- `getExperimentState`
- `registerParticipantView`
- `applyIntervention`

### Provider boundary rules

The provider `/ws/provider` boundary:

- may use provider message types only
- must reject participant, researcher, and browser control messages

Examples of provider-only concerns:

- `providerHello`
- `providerHeartbeat`
- `providerSubmitProposal`
- `providerRequestAutonomousApply`

## Advisory And Autonomous Semantics

### Advisory

In advisory mode:

- provider submits `providerSubmitProposal`
- backend validates it
- backend creates a pending proposal if valid
- researcher remains responsible for approving or rejecting it

### Autonomous

In autonomous mode:

- provider submits `providerRequestAutonomousApply`
- backend validates session state, execution mode, freshness, and intervention safety rules
- backend may apply the intervention if valid
- backend remains the final authority

Autonomous messages are requests, not self-executing commands.

## Required Validation Rules

The backend should reject provider messages when:

- protocol version is unsupported
- provider id is missing
- auth token is invalid
- session id does not match the active session
- required rationale or signal fields are missing
- intervention payload is malformed
- the message arrives on the wrong actor boundary

## Correlation And Provenance Requirements

Provider-authored decision messages should preserve:

- `providerId`
- `sessionId`
- `correlationId`
- `proposalId` where applicable
- provider-observed timestamp
- rationale
- signal summary
- requested intervention details

These fields are required so exports and replay can reconstruct what the provider proposed and why.

## Current Phase Coverage

The current implementation now covers:

- provider transport handling on `/ws/provider`
- shared-secret provider registration and heartbeat acceptance
- outbound provider session, decision-context, gaze, focus, viewport, attention, intervention, and decision-update messages
- inbound provider proposal submission and autonomous-apply requests flowing into the backend-owned decision lifecycle

Still deferred to later phases:

- provider timeout and stale-heartbeat degradation
- researcher-facing provider status UI
- export/replay preservation of the new provider-side correlation fields
