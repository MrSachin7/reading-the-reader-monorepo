# Phase 6: Researcher Live Mirror & Session Operations - Research

**Date:** 2026-03-31
**Phase:** 06 - Researcher Live Mirror & Session Operations

## Planning Question

What implementation slices will turn the existing researcher live page, experiment session controls, and realtime session contracts into one trustworthy operator console that can run and supervise an active experiment?

## Current Runtime Assessment

### What already works

- `Frontend/src/modules/pages/researcher/current-live/index.tsx` already hydrates the live session, computes sample rate and validity rate, and decides between exact mirror and supervisory follow behavior.
- `LiveReaderColumn.tsx` already renders a viewport-scaled exact mirror when participant viewport data and fullscreen conditions are available, and falls back to a readable supervisory reader otherwise.
- `LiveControlsColumn.tsx` already exposes automation pause/resume, proposal approval/rejection, execution-mode switching, manual interventions, and some live health metrics.
- `LiveMetadataColumn.tsx` already shows participant/session metadata, proposal history, and intervention history with module-aware provenance.
- `ExperimentStepper` already owns authoritative start gating, and `ExperimentCompletionActions` already gives both the experiment page and live page a path to finish and export a session.

### Where the live operator story is still too weak

1. Mirror trust is under-signaled.
   The live page already falls back when exact mirroring is unavailable, but the degradation message is still lightweight. The thesis story needs the operator to know clearly when the console is showing the participant exactly versus approximately.

2. Health metrics exist without operator semantics.
   Sample rate, validity, and latency are visible, but they do not yet read like actionable health states with urgency and interpretation.

3. Session operations are still split between pages.
   Setup/start authority lives on the experiment workflow, while finish/export and intervention supervision also appear on the live page. The platform needs a clearer “one researcher console” story rather than loosely connected controls.

4. Runtime chronology is visible but not yet framed as in-the-moment evidence.
   Proposal and intervention history exist, but the live surface still needs a clearer “what just happened, why, and what should the researcher trust now” story.

5. Backend-to-frontend live status contracts remain thin.
   The frontend currently infers several operator states from raw fields like fullscreen, viewport dimensions, and local timers. Phase 6 should decide which trust/health states remain local UI derivations and which should be explicit stable contract mirrors.

## Recommended Target Architecture

### 1. Make exact mirror the primary trust state

The researcher live surface should explicitly distinguish:

- exact participant mirror
- supervisory follow mode
- manual researcher view

This should not be a subtle styling detail. It should be a first-class operator state that explains whether the researcher is seeing participant truth or a readable fallback approximation.

### 2. Promote health from raw metrics to operator guidance

Latency, sample rate, validity, and participant viewport freshness should be grouped into a live health story that answers:

- is the session healthy enough to trust right now
- what is degraded
- whether the issue affects mirror trust, intervention timing, or overall session quality

### 3. Tighten researcher operations into one supervised flow

Phase 6 should not move session authority away from the backend-backed experiment workflow, but it should make the researcher experience feel continuous across:

- start from experiment setup
- transition to live supervision
- pause/resume automation
- approve/reject proposals
- manually intervene
- finish/export when the run is done

### 4. Treat chronology as live evidence, not only history

The live surface should foreground the most recent intervention/proposal outcomes and keep recent chronology readable enough that a researcher can defend what happened during the run without searching across pages.

### 5. Preserve Phase 5 reader authority

The participant reader is already authoritative and lock-aware. The live mirror should consume that truth rather than introducing a second adjustable reader model. Any mirror-mode or operator controls must stay explicitly researcher-side and not mutate participant conditions unless they are deliberate interventions.

## Recommended Plan Slices

### Slice A: Live authority and health contract hardening

Purpose:

- define the operator-facing live states the platform must support
- harden backend/frontend contract expectations around active-session status, health, and monitorability
- add Wave 0 coverage before the UI gains stronger live-console semantics

Likely file areas:

- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionSnapshot.cs`
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionManager.cs`
- `Frontend/src/lib/experiment-session.ts`
- `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/*Experiment*Tests.cs`

Expected outcome:

- the live console depends on explicit, defendable session-monitoring contracts rather than ad hoc interpretation spread across pages

### Slice B: Exact-mirror-first reader trust experience

Purpose:

- strengthen the exact mirror versus supervisory fallback story
- make degraded exact-mirror states visible and unmistakable
- keep the fallback readable without pretending it is exact

Likely file areas:

- `Frontend/src/modules/pages/researcher/current-live/index.tsx`
- `Frontend/src/modules/pages/researcher/current-live/components/LiveReaderColumn.tsx`
- `Frontend/src/modules/pages/researcher/current-live/types.ts`
- `Frontend/src/modules/pages/researcher/current-live/utils.ts`

Expected outcome:

- the researcher can tell at a glance whether the mirror is exact, approximate, or manually detached

### Slice C: Session operations and supervision console tightening

Purpose:

- turn the current mix of controls into a clearer operator console
- keep start/finish/supervision actions coherent across experiment setup and live monitoring
- emphasize live health, proposals, and manual interventions as one supervision surface

Likely file areas:

- `Frontend/src/modules/pages/researcher/current-live/components/LiveControlsColumn.tsx`
- `Frontend/src/modules/pages/experiment/components/experiment-stepper.tsx`
- `Frontend/src/components/experiment/experiment-completion-actions.tsx`
- `Frontend/src/redux/api/experiment-session-api.ts`

Expected outcome:

- the researcher can operate a session without the workflow feeling split between disconnected surfaces

### Slice D: Chronology, latest status evidence, and closeout validation

Purpose:

- make recent proposal/intervention chronology easier to interpret during the run
- align metadata and live status panels with the trust model from the earlier slices
- close Phase 6 with automated regressions and explicit manual checks for second-screen behavior

Likely file areas:

- `Frontend/src/modules/pages/researcher/current-live/components/LiveMetadataColumn.tsx`
- `Frontend/src/modules/pages/researcher/current-live/index.tsx`
- `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/*.cs`
- `.planning/phases/06-researcher-live-mirror-session-operations/06-VALIDATION.md`

Expected outcome:

- Phase 6 ends with a thesis-defensible live console story: what the participant saw, how healthy the run was, what fired, and what the researcher did

## UI Planning Posture

This phase should read like operational tooling, not a generic dashboard. The mirror trust state needs strong, obvious signaling, but the live page should still remain calm enough for a researcher to supervise a reading session for an extended period. Favor operator clarity over decoration and keep the participant mirror visually central.
