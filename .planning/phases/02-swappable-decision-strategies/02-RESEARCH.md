# Phase 2: Swappable Decision Strategies - Research

**Date:** 2026-03-26
**Phase:** 02 - Swappable Decision Strategies

## Planning Question

What implementation slices will turn the current manual-only intervention path into a stable decision-strategy architecture that supports manual, rule-based, hybrid, and external-provider modes through one backend-owned strategy boundary, while preserving researcher authority, replay fidelity, and additive registration?

## Current Runtime Assessment

### What already works

- [`Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionManager.cs`](Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionManager.cs) already owns canonical session truth, applies interventions, records replay history, and broadcasts the authoritative runtime snapshot.
- [`Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ReadingInterventionRuntime.cs`](Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ReadingInterventionRuntime.cs) already encapsulates the actual presentation/appearance mutation logic and produces applied intervention events.
- [`Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentCommandIngress.cs`](Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentCommandIngress.cs) already gives the backend a transport-to-application seam that can accept more strategy-related commands without reintroducing raw transport parsing into runtime authority.
- [`Frontend/src/modules/pages/researcher/current-live/index.tsx`](Frontend/src/modules/pages/researcher/current-live/index.tsx) and [`Frontend/src/modules/pages/researcher/current-live/components/LiveControlsColumn.tsx`](Frontend/src/modules/pages/researcher/current-live/components/LiveControlsColumn.tsx) already provide the researcher live control surface and manual intervention entry path.
- [`Backend/src/infrastructure/ReadingTheReader.Realtime.Persistence/ExperimentReplayExportSerializer.cs`](Backend/src/infrastructure/ReadingTheReader.Realtime.Persistence/ExperimentReplayExportSerializer.cs) and [`Frontend/src/lib/experiment-replay.ts`](Frontend/src/lib/experiment-replay.ts) already define the replay/export contract path that Phase 2 must extend rather than bypass.

### Where the architecture is currently too narrow or too coupled

1. There is no decision-strategy boundary yet.
   The only decision path today is the researcher sending `applyIntervention` directly over realtime transport. This means the system has intervention execution but not a distinct strategy contract.

2. Applied interventions and decision provenance are collapsed together.
   Current intervention events only describe applied changes (`source`, `trigger`, `reason`) and cannot represent pending, approved, rejected, superseded, or expired non-manual proposals.

3. No curated decision-context object exists.
   A future strategy would either need direct access to internal runtime state or duplicate mapping logic ad hoc, which would weaken the modularity story.

4. Session condition and execution policy are not modeled.
   The current experiment setup flow configures participant, calibration, reading material, and presentation, but not decision provider, advisory/autonomous execution, automation pause state, or supervisory controls.

5. Replay/export cannot yet explain how a decision happened.
   Current export chronology records applied intervention events only, which is not sufficient for advisory or hybrid flows where many proposals may never be applied.

## Recommended Target Architecture

### 1. Keep runtime authority backend-owned

Phase 1 established that the backend remains the canonical experiment authority. Phase 2 should preserve that: decision providers do not mutate reader state directly. They either emit a proposal or, in the manual researcher path, request a direct intervention through runtime authority.

### 2. Separate decision provider from execution policy

The cleanest way to match the locked context decisions is to model:

- a **decision provider** (`manual`, `rule-based`, `external`)
- an **execution mode** (`advisory`, `autonomous`)
- a **researcher supervisory state** (paused/resumed, override available)

The UI can still present named experiment conditions such as:

- `Manual only`
- `Rule-based advisory`
- `Rule-based autonomous`
- `External advisory`
- `External autonomous`

but the stored runtime model should keep provider and execution mode separate so future providers remain additive.

### 3. Introduce a curated decision-context contract

Decision providers should receive a purpose-built context object derived from the authoritative session state, not the entire runtime snapshot. The first contract version should include only decision-relevant fields:

- active session condition
- current reading presentation and appearance
- reading focus and aggregated attention summary
- participant viewport state
- recent intervention history
- session activity metadata needed to time decisions

It should explicitly exclude transport-specific envelopes, replay archives, and unrelated orchestration details.

### 4. Model proposals separately from applied interventions

The decision boundary should produce a dedicated proposal lifecycle model, not overload intervention events. The runtime then either:

- leaves the proposal pending for researcher approval/rejection, or
- auto-applies it and records that automatic resolution

Manual researcher interventions remain a direct apply path, but they should still produce enough provenance to show they were direct manual actions rather than approved proposals.

### 5. Keep only one unresolved non-manual proposal active

The phase context decision to avoid stacking unresolved proposals materially simplifies both runtime behavior and researcher UX. The runtime should therefore enforce one active unresolved proposal at a time and mark older ones as superseded when:

- a newer non-manual proposal replaces them, or
- the researcher applies a manual intervention that changes the context

## Recommended Target Contracts

### Decision strategy boundary

Recommended new backend-facing contracts:

- `DecisionStrategyContracts.cs`
- `IDecisionStrategy.cs`
- `IDecisionStrategyRegistry.cs`
- `IDecisionContextFactory.cs`
- `IDecisionStrategyCoordinator.cs`

These should live under `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/` so the strategy boundary stays adjacent to the authoritative runtime contracts rather than becoming a transport concern.

### Session and supervisory contracts

Recommended new snapshot/command shapes:

- `DecisionConfigurationSnapshot`
- `DecisionProposalSnapshot`
- `DecisionRuntimeStateSnapshot`
- `UpdateDecisionConfigurationCommand`
- `ApproveDecisionProposalCommand`
- `RejectDecisionProposalCommand`
- `SetDecisionAutomationPausedCommand`
- `SetDecisionExecutionModeCommand`

These should become part of the authoritative session/read-model surfaces instead of living only in frontend-local state.

### Realtime transport extensions

Recommended new message types to mirror the supervisory rules:

- `decisionProposalChanged`
- `approveDecisionProposal`
- `rejectDecisionProposal`
- `pauseDecisionAutomation`
- `resumeDecisionAutomation`
- `setDecisionExecutionMode`

These should continue to flow through `RealtimeIngressCommands.cs` and `ExperimentCommandIngress.cs`, not directly into transport parsing branches.

## Built-In Provider Posture for Phase 2

Phase 2 does not need a real AI implementation, but it should leave the architecture in a state where future providers are additive. The safest posture is:

- preserve the existing direct manual path
- add a minimal built-in rule-based strategy that can issue proposals from existing attention/focus signals
- add an external-provider stub or adapter seam that satisfies the same strategy contract but can return no proposal until a real external team implements it

This is enough to prove swappability and additive registration without shipping an in-repo AI model.

## Recommended Plan Slices

### Slice A: Strategy contracts, curated context, and characterization tests

Purpose:

- define the first stable strategy boundary
- prove that a curated decision context can be derived from the current session state
- add regression tests before runtime lifecycle logic grows

Likely file areas:

- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/DecisionStrategyContracts.cs`
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/IDecisionStrategy.cs`
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/DecisionContextFactory.cs`
- `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/DecisionStrategyContractTests.cs`
- `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/DecisionContextFactoryTests.cs`

Expected outcome:

- later plans can wire strategy behavior against a stable contract instead of inventing proposal shapes inline

### Slice B: Runtime integration, provider registration, and proposal lifecycle

Purpose:

- wire rule-based/external-provider scaffolds into one strategy registry
- teach runtime authority to manage proposals, approvals, rejections, supersession, and manual override
- keep manual direct apply intact

Likely file areas:

- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionManager.cs`
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/IExperimentRuntimeAuthority.cs`
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentCommandIngress.cs`
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/RealtimeIngressCommands.cs`
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/MessageTypes.cs`
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationModuleInstaller.cs`

Expected outcome:

- strategy-specific branching no longer leaks across unrelated modules, and new providers plug in through registration rather than invasive runtime edits

### Slice C: Session configuration, replay/export provenance, and frontend contract exposure

Purpose:

- expose session condition and proposal state through authoritative read models
- record proposal lifecycle separately from applied interventions in replay/export
- align backend/frontend contract mirrors before researcher UI work

Likely file areas:

- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentReplayExport.cs`
- `Backend/src/infrastructure/ReadingTheReader.Realtime.Persistence/ExperimentReplayExportSerializer.cs`
- `Backend/src/ReadingTheReader.WebApi/Contracts/ExperimentSession/*.cs`
- `Backend/src/ReadingTheReader.WebApi/ExperimentSessionEndpoints/*.cs`
- `Frontend/src/lib/experiment-session.ts`
- `Frontend/src/lib/gaze-socket.ts`
- `Frontend/src/lib/experiment-replay.ts`
- `Frontend/src/redux/api/experiment-session-api.ts`

Expected outcome:

- advisory/autonomous behavior is visible and replayable, not hidden behind backend-only state

### Slice D: Researcher experiment-condition setup and live supervisory controls

Purpose:

- let the researcher choose a named experiment condition before start
- surface pending proposals, decisions, automation state, and supervisory controls during live operation
- keep the control surface aligned with the existing UI language rather than inventing a new design system

Likely file areas:

- `Frontend/src/modules/pages/experiment/components/experiment-stepper.tsx`
- `Frontend/src/modules/pages/researcher/current-live/index.tsx`
- `Frontend/src/modules/pages/researcher/current-live/components/LiveControlsColumn.tsx`
- `Frontend/src/modules/pages/researcher/current-live/components/LiveMetadataColumn.tsx`
- `Frontend/src/modules/pages/researcher/current-live/types.ts`

Expected outcome:

- the phase produces a visible researcher workflow for manual-only, advisory, and autonomous conditions without making the phase primarily a UI redesign

## UI Planning Posture

This phase has frontend work, but it is not a design-first UI phase. The researcher setup and live-view changes should preserve the existing shadcn-based cards, fields, badges, and control-panel language already used in:

- `Frontend/src/modules/pages/experiment/components/experiment-stepper.tsx`
- `Frontend/src/modules/pages/researcher/current-live/components/LiveControlsColumn.tsx`
- `Frontend/src/modules/pages/researcher/current-live/components/LiveMetadataColumn.tsx`

Planning can proceed without a separate UI-SPEC as long as the implementation stays within those established patterns.

## Verification Strategy

The phase must prove strategy swappability and supervisory control as architectural behavior, not just add new enums.

### Evidence that should exist after execution

1. Decision providers plug in through a stable strategy registration boundary rather than strategy-specific branches spread through sensing, UI, or export code.
2. Manual researcher interventions still apply immediately and remain first priority.
3. Non-manual decision providers can run in advisory or autonomous mode without changing the strategy contract.
4. The runtime exposes at most one unresolved non-manual proposal at a time and supersedes stale ones when context changes.
5. Replay/export data distinguishes proposal lifecycle events from applied intervention events.
6. Researcher setup and live control surfaces show the selected condition and supervisory state coherently.

### Best automated checks for this repo

- xUnit tests for contract/default behavior, proposal lifecycle, and replay/export serialization
- xUnit tests proving manual direct apply still works while advisory proposals remain distinct
- grep-able DI registration proving built-in providers are registered through one strategy interface
- frontend production build to catch contract drift across mirrored TypeScript types

## Validation Architecture

### Current test infrastructure

- Backend tests: xUnit in `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/`
- Frontend automated validation: build-only through `bun run build --cwd Frontend`
- Existing gap: no committed frontend unit test framework, so plan slices should rely on build verification and backend contract/serialization tests

### Recommended validation shape for planning

- earliest plan should add decision-strategy contract tests before deeper runtime lifecycle changes
- each backend slice should add at least one replay/proposal/assertion test rather than depending only on build success
- frontend-heavy slices should pair `bun run build --cwd Frontend` with grep-verifiable acceptance criteria because there is no existing frontend test runner

## Concrete Planning Implications

Planning should bias toward:

- one stable provider contract with additive registration
- keeping manual direct apply as a first-class path
- separating proposal lifecycle from intervention execution
- updating backend/frontend mirrors in the same slice whenever shared contracts change
- recording advisory/autonomous behavior in replay/export, not just in transient UI state

Planning should avoid:

- implementing actual AI model logic inside the repo
- introducing multi-provider arbitration in this phase
- exposing the full internal session snapshot directly to strategy implementations
- hiding strategy state in UI-only local state or app-wide settings unrelated to the active experiment session

## Recommended Planning Posture

- Treat this as a backend-led architecture phase with focused frontend supervisory extensions.
- Prefer 4 plans with explicit dependencies instead of a single broad “decision architecture refactor.”
- Make the runtime contract slices land before the researcher UI slice so the frontend consumes stable messages and snapshots instead of chasing moving backend semantics.

---

*Research completed for Phase 02*
