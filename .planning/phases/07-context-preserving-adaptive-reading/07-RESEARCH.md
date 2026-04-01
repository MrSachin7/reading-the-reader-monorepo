# Phase 7: Context-Preserving Adaptive Reading - Research

**Date:** 2026-04-01
**Phase:** 07 - Context-Preserving Adaptive Reading

## Planning Question

What implementation slices will turn the existing reader focus, viewport, and intervention seams into a defendable continuity-preservation runtime that keeps reading position stable, surfaces degraded outcomes, and applies layout-changing interventions with flow-preserving guardrails?

## Current Runtime Assessment

### What already works

- `Frontend/src/modules/pages/reading/components/ReaderShell.tsx` already centralizes participant-side presentation updates, viewport metrics, focus tracking, and the context-preservation hook.
- `Frontend/src/modules/pages/reading/lib/usePreserveReadingContext.ts` already captures an active token plus nearby fallback tokens and attempts multi-frame scroll restoration after a presentation change.
- `Frontend/src/modules/pages/reading/pages/ReadingPage.tsx` already sends authoritative participant viewport and focus updates over realtime transport.
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Interventions/ReadingInterventionRuntime.cs` already applies backend-owned presentation and appearance interventions in one canonical place.
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Session/ExperimentSessionManager.cs` already owns participant viewport state, focus state, intervention history, and the live session snapshot.
- `Frontend/src/modules/pages/researcher/current-live/components/LiveControlsColumn.tsx` and `Frontend/src/lib/reader-shell-settings.ts` already expose preserve-context and highlight-context options in the live workflow.

### Where the current implementation is still too weak

1. Continuity outcomes are mostly frontend-local.
   The participant reader currently tries to restore place, but the result is not projected back into the authoritative session contract. The researcher can see focus freshness, not whether context preservation actually succeeded.

2. Anchor capture depends too heavily on the current gaze-active token.
   When the focused token is stale or absent, the hook has weak fallback behavior. This makes layout-changing interventions fragile exactly when the reader signal is noisy.

3. Backend intervention safety does not yet account for reading disruption.
   The runtime can apply layout-changing presentation changes, but it does not yet enforce cadence, magnitude, or repeated-change guardrails intended to preserve rhythm.

4. Later inspection is underpowered.
   There is no first-class continuity-status projection for the live console, and there is no explicit preservation event flow that says preserved, degraded, or failed after an intervention.

5. The participant DOM is the only place that can measure anchor success precisely.
   The backend knows when an intervention was applied, but it cannot directly observe token alignment error or viewport compensation quality. Phase 7 therefore needs a participant-to-backend continuity report seam rather than pure backend inference.

## Recommended Target Architecture

### 1. Introduce an authoritative context-preservation report contract

Add a stable participant-observation payload for continuity outcomes. The participant reader should measure the result of each layout-changing intervention and send a structured report back through the existing reader-observation realtime path.

Recommended fields:

- `status`: `preserved`, `degraded`, or `failed`
- `anchorSource`: `active-token`, `fallback-token`, `block-anchor`, or `scroll-only`
- `anchorTokenId`
- `anchorBlockId`
- `anchorErrorPx`
- `viewportDeltaPx`
- `interventionAppliedAtUnixMs`
- `measuredAtUnixMs`
- `reason`

This keeps the backend authoritative while acknowledging that the participant DOM owns the measurable truth about post-layout alignment.

### 2. Harden the participant anchoring algorithm instead of replacing it

The existing `usePreserveReadingContext` seam is the right base. Improve it by:

- capturing more than one fallback anchor class
- tolerating missing gaze-active tokens
- measuring post-restore error explicitly
- reporting both success and degradation, not only doing best-effort scroll compensation

The right posture is additive hardening, not a reader rewrite.

### 3. Make intervention guardrails part of runtime safety

Phase 7 should not treat every layout-changing intervention as equally safe. The backend runtime should classify layout-affecting changes and apply flow guardrails such as:

- minimum cooldown between layout-changing interventions
- maximum per-step deltas for disruptive fields
- rejection of repeated no-op or oscillating changes
- clear reason strings when a candidate intervention is suppressed

These guardrails should apply to both manual and automated paths so the thesis can defend continuity as a property of the platform, not of one trigger source.

### 4. Project continuity health into researcher supervision

The live console should surface:

- latest continuity status
- whether the latest layout change was preserved, degraded, or failed
- anchor source and error magnitude
- guardrail/cooldown state when layout changes are temporarily suppressed

This should strengthen the Phase 6 trust model rather than introducing a second console.

## Recommended Plan Slices

### Slice A: Authoritative continuity contract and participant report seam

Purpose:

- define a stable continuity-status contract
- add a participant-to-backend reporting path using the existing reader-observation ingress
- pin Phase 7 authority assumptions with backend tests

Likely file areas:

- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Reading/LiveReadingSessionSnapshot.cs`
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Session/ExperimentSessionSnapshot.cs`
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Messaging/MessageTypes.cs`
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Messaging/RealtimeIngressCommands.cs`
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Messaging/ExperimentCommandIngress.cs`
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Reading/IReaderObservationService.cs`
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Reading/ReaderObservationService.cs`
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Session/ExperimentSessionManager.cs`
- `Frontend/src/lib/experiment-session.ts`
- `Frontend/src/lib/gaze-socket.ts`
- `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ExperimentSessionAuthorityTests.cs`

Expected outcome:

- continuity outcomes become part of the authoritative live session instead of remaining hidden in the participant browser

### Slice B: Participant-side anchor measurement and recovery hardening

Purpose:

- strengthen `usePreserveReadingContext` so it can preserve place more reliably
- measure anchor error and viewport compensation outcome after each layout change
- send structured continuity results back to the backend

Likely file areas:

- `Frontend/src/modules/pages/reading/lib/usePreserveReadingContext.ts`
- `Frontend/src/modules/pages/reading/components/ReaderShell.tsx`
- `Frontend/src/modules/pages/reading/pages/ReadingPage.tsx`
- `Frontend/src/lib/gaze-socket.ts`

Expected outcome:

- layout-changing interventions preserve place using measured token or block anchors rather than only approximate scroll recovery

### Slice C: Runtime flow guardrails for layout-changing interventions

Purpose:

- classify which interventions are layout-affecting
- enforce cooldown and maximum-step guardrails in the backend runtime
- record when disruptive changes are suppressed so the result is inspectable

Likely file areas:

- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Interventions/ReadingInterventionRuntime.cs`
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Session/ExperimentSessionManager.cs`
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Reading/LiveReadingSessionSnapshot.cs`
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Session/ExperimentSessionSnapshot.cs`
- `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ExperimentSessionAuthorityTests.cs`

Expected outcome:

- the platform can defend that layout changes are rate-limited and magnitude-limited to support rhythm, not only that they are technically possible

### Slice D: Researcher-live continuity evidence and phase closeout

Purpose:

- surface continuity status and guardrail state in the researcher live workflow
- keep the continuity story aligned with the existing exact-mirror trust model
- close the phase with backend regression, backend build, frontend build, and manual UAT guidance

Likely file areas:

- `Frontend/src/modules/pages/researcher/current-live/index.tsx`
- `Frontend/src/modules/pages/researcher/current-live/components/LiveMetadataColumn.tsx`
- `Frontend/src/modules/pages/researcher/current-live/components/LiveControlsColumn.tsx`
- `Frontend/src/lib/experiment-session.ts`
- `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ExperimentSessionAuthorityTests.cs`

Expected outcome:

- the researcher can explain whether reading continuity held after a live intervention and whether the system suppressed additional layout changes to protect flow

## Validation Architecture

Phase 7 needs both backend authority checks and frontend build verification.

### Automated validation backbone

- Backend targeted contract and guardrail coverage should live in `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ExperimentSessionAuthorityTests.cs`.
- Backend full-suite regression should continue to use `dotnet test Backend/reading-the-reader-backend.sln -v minimal`.
- Backend build verification should continue to use `dotnet build Backend/reading-the-reader-backend.sln -v minimal`.
- Frontend production verification should continue to use `bun run build` from `Frontend/`.

### Manual-only checks still required

- Confirm a participant can continue reading after a live layout change without obvious loss of place.
- Confirm degraded or failed continuity states are clear enough for a researcher to notice and explain.
- Confirm cooldown behavior is visible and understandable when repeated layout changes are attempted.

### Recommended verification cadence

- After every backend contract or guardrail task: run the targeted backend test filter for `ExperimentSessionAuthorityTests`.
- After every participant-reader or researcher-live frontend task: run `bun run build` from `Frontend/`.
- After each wave: run backend full suite plus frontend build.

## UI Planning Posture

Phase 7 should feel calm and evidence-driven, not flashy. Continuity indicators should read like experiment trust signals: visible when something degraded, quiet when continuity is preserved. The participant experience stays primary; the researcher view explains what happened without overwhelming the reader workflow.
