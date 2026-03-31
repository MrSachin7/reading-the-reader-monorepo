# Phase 5: Controlled Markdown Reading Baseline - Research

**Date:** 2026-03-31
**Phase:** 05 - Controlled Markdown Reading Baseline

## Planning Question

What implementation slices will turn the existing Markdown setup flow, reading-session snapshot, and participant reader into one controlled, thesis-defensible reading baseline with clear researcher-owned presentation conditions?

## Current Runtime Assessment

### What already works

- `ReadingMaterialSetupService.cs` already validates and persists Markdown reading setups with typography defaults.
- `ExperimentSessionManager.SetReadingSessionAsync()` already writes authoritative reading content and presentation into the live session snapshot.
- `experiment-stepper.tsx` already includes a reading-material step and explicit save-to-session behavior after Phase 4.
- `ReadingPage.tsx` already prefers live-session content and presentation when available.
- `ReaderShell.tsx` already centralizes the participant reading surface, including typography application, toolbar behavior, focus mode, and stable document tokenization.
- `MarkdownReader.tsx` already renders a constrained Markdown subset that is appropriate for controlled reading content.

### Where the baseline is still too loose

1. Active-session authority is weakened by local fallbacks.
   The participant page still mixes backend session data with local draft and mock fallbacks, which is acceptable for development scaffolding but weak for a controlled thesis baseline.

2. Researcher-owned baseline versus local user settings is still blurry.
   `useReadingSettings.ts` persists reading presentation in local storage, which is useful for setup authoring but currently strong enough to muddy the line between “saved session condition” and “local browser residue.”

3. Lock semantics are present but under-expressed.
   `editableByResearcher` exists in the reading presentation contract, but the product story still reads like a generic adjustable reader rather than a controlled experimental surface.

4. The setup flow is functional but not yet framed as “define and save the session baseline.”
   The reading-material setup page and experiment stepper can already save content and defaults, but they do not yet make the controlled-condition story explicit enough for thesis defense.

5. Degraded states are not first-class enough on the participant route.
   A live experiment reader should show clear loading or missing-baseline states instead of silently substituting mock text.

## Recommended Target Architecture

### 1. Tighten backend-owned reading baseline authority

The active session should expose one clear source of truth for:

- active Markdown content
- active presentation settings
- active appearance settings
- whether participant-side presentation changes are allowed

The participant route should follow that truth directly during active sessions.

### 2. Separate researcher setup helpers from active-session truth

Local storage can remain useful while the researcher edits or previews setups, but once a session is active the participant view should not derive its baseline from local browser state. Phase 5 should make that distinction explicit in the frontend flow.

### 3. Turn lock state into an explicit experimental condition

The reading baseline should not only capture typography defaults. It should also clearly express whether the participant surface is allowed to expose adjustment controls or keyboard-based presentation changes.

### 4. Strengthen the researcher baseline workflow

The reading-material setup page and experiment stepper should clearly communicate:

- what is being edited locally
- what has been saved as a reusable reading setup
- what has been saved into the authoritative session baseline
- whether the resulting participant view is locked or adjustable

### 5. Treat missing/loading reader states as part of the experiment UX

If the participant route is opened before the reading baseline is ready, or if the active session lacks configured content, the UI should explain that state plainly rather than rendering placeholder text that could be mistaken for real study material.

## Recommended Plan Slices

### Slice A: Backend session-baseline contract hardening

Purpose:

- make the active reading baseline explicit and authoritative
- pin lock and baseline semantics with backend tests
- ensure the participant route can rely on stable session-reading state

Likely file areas:

- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionSnapshot.cs`
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionManager.cs`
- `Backend/src/ReadingTheReader.WebApi/Contracts/ExperimentSession/UpsertReadingSessionRequest.cs`
- `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/*Reading*Tests.cs`

Expected outcome:

- the backend exposes a clearer controlled-reading baseline contract instead of an implicitly interpreted bundle of fields

### Slice B: Researcher reading-baseline setup and save workflow

Purpose:

- strengthen the researcher story around saved Markdown setups and session baseline selection
- reduce drift between local setup editing, reusable saved setups, and authoritative session state

Likely file areas:

- `Frontend/src/modules/pages/reading-material-setup/index.tsx`
- `Frontend/src/modules/pages/experiment/components/experiment-stepper.tsx`
- `Frontend/src/modules/pages/reading/lib/useReadingSettings.ts`
- `Frontend/src/redux/api/reading-material-api.ts`

Expected outcome:

- the researcher can define, preview, save, and apply a controlled reading baseline without ambiguity

### Slice C: Participant reading-route stabilization

Purpose:

- remove ambiguous active-session fallbacks
- enforce baseline lock semantics on the participant surface
- treat missing/loading/degraded reader states as first-class outcomes

Likely file areas:

- `Frontend/src/modules/pages/reading/pages/ReadingPage.tsx`
- `Frontend/src/modules/pages/reading/components/ReaderShell.tsx`
- `Frontend/src/modules/pages/reading/components/ReadingToolbar.tsx`
- `Frontend/src/modules/pages/reading/components/MarkdownReader.tsx`

Expected outcome:

- the participant reader behaves like a stable experiment surface rather than a generic adjustable demo reader

### Slice D: Validation, compatibility, and closeout

Purpose:

- verify backend/frontend contract alignment and controlled-reading behavior
- keep mirror/replay compatibility with the stabilized reader shell
- close the planning artifacts with clear manual checks

Likely file areas:

- `Frontend/src/lib/experiment-session.ts`
- `Frontend/src/modules/pages/researcher/current-live/components/LiveReaderColumn.tsx`
- `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/*.cs`
- `.planning/phases/05-controlled-markdown-reading-baseline/05-VALIDATION.md`

Expected outcome:

- Phase 5 closes with automated confidence around the controlled baseline and manual checks aimed at reading stability rather than future live-control phases

## UI Planning Posture

This phase should keep the reader calm and legible. Avoid turning the participant view into a tool-heavy interface. The researcher needs clarity during setup, while the participant route should read like a stable document surface with explicit, quiet handling of locked, loading, or unavailable states.
