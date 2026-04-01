# Phase 6: Researcher Live Mirror & Session Operations - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning
**Source:** Derived during `$gsd-discuss-phase 6` from roadmap, requirements, prior phases, and current codebase

<domain>
## Phase Boundary

Phase 6 should make the researcher live surface trustworthy enough to run and supervise an active experiment from one place. The goal is not to redesign the participant reader again or to solve context-preserving adaptive reading yet. The goal is to make the live mirror, session operations, runtime health signals, and intervention/proposal supervision read like one dependable researcher console during an active session.

</domain>

<decisions>
## Implementation Decisions

### Mirror Trust Model
- **D-01:** Phase 6 should treat exact participant mirroring as the primary trust model for the researcher live surface whenever the platform has enough viewport/fullscreen state to support it.
- **D-02:** When exact mirroring is available, it should be the default and most trustworthy presentation rather than an optional secondary mode.
- **D-03:** When exact mirroring degrades or becomes unavailable, the system should automatically fall back to the supervisory reader view instead of freezing the last exact frame or replacing the reader area entirely.
- **D-04:** That fallback must be explicit. The live surface should show a strong warning/status treatment that the view is no longer exact, rather than silently degrading into a lookalike supervisory mode.

### Prior Decisions Carried Forward
- **D-05:** Backend experiment authority from earlier phases remains the source of truth for active session state, setup, reading content, interventions, and decision/proposal status.
- **D-06:** The participant reading surface is already authoritative and lock-aware after Phase 5, so the researcher mirror must reflect participant truth instead of behaving like a separate adjustable reader.

### Scope Control
- **D-07:** Phase 6 is about trustworthy live operation and supervision, not about new intervention modules, new decision providers, or context-preserving adaptive reading behavior.
- **D-08:** Phase 6 should improve the operator console around active sessions, but not add unrelated study tooling or post-session analytics that belong to later phases.

### the agent's Discretion
- How strong the degraded-mirror warning treatment should be, as long as it is clearly visible and unmistakable when exact mirroring is lost.
- How the live surface balances exact-mirror mode with the fallback supervisory mode, provided exact mirror remains the preferred trust state.
- Which remaining Phase 6 gray areas need deeper research during planning, especially health semantics, command prioritization, and chronology/event surfacing.

</decisions>

<canonical_refs>
## Canonical References

- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/STATE.md`
- `Frontend/src/modules/pages/researcher/current-live/index.tsx`
- `Frontend/src/modules/pages/researcher/current-live/components/LiveReaderColumn.tsx`
- `Frontend/src/modules/pages/researcher/current-live/components/LiveControlsColumn.tsx`
- `Frontend/src/modules/pages/researcher/current-live/components/LiveMetadataColumn.tsx`
- `Frontend/src/modules/pages/researcher/current-live/types.ts`
- `Frontend/src/modules/pages/researcher/current-live/utils.ts`
- `Frontend/src/lib/gaze-socket.ts`
- `Frontend/src/lib/experiment-session.ts`
- `Frontend/src/lib/use-live-experiment-session.ts`
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionManager.cs`
- `Backend/src/ReadingTheReader.WebApi/Websockets/WebSocketConfiguration.cs`
- `Backend/src/infrastructure/ReadingTheReader.RealtimeMessenger/WebSocketRealtimeMessenger.cs`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- The researcher live page already has the major building blocks in place: live session hydration, intervention controls, proposal supervision, metadata/history panels, and a reader mirror surface.
- `LiveReaderColumn.tsx` already supports both exact-mirror rendering and a supervisory fallback reader.
- `index.tsx` already computes `exactMirrorEnabled`, `followParticipant`, and lightweight mirror status labels.
- `LiveControlsColumn.tsx` already exposes sample rate, validity, latency, automation pause/resume, execution-mode control, and manual interventions.
- `LiveMetadataColumn.tsx` already surfaces intervention history, proposal history, and participant/session details.

### Current Gaps
- The current degraded-mirror state is only lightly signaled; it does not yet carry the stronger trust warning needed for a thesis-defensible live console.
- The health metrics exist, but their meaning and operator urgency are still shallow.
- Session operations exist across experiment and live surfaces, but the single trustworthy operator-console story is not fully tightened yet.

### Integration Points
- Phase 6 will likely center on `Frontend/src/modules/pages/researcher/current-live/*`, while depending on existing realtime/session contracts from the backend.
- Any stronger trust/degradation story should preserve compatibility with the authoritative reading session introduced in Phase 5.

</code_context>

<specifics>
## Specific Ideas

- Make exact mirror the preferred live mode and clearly communicate when the console has dropped to a supervisory approximation.
- Treat degraded mirror status as a first-class operator state, not just a small badge.
- Keep the live console focused on active-session trust: what the participant is seeing, what the system health looks like, and what the researcher can safely do next.

</specifics>

<deferred>
## Deferred Ideas

- Freezing the last exact mirrored frame as the fallback behavior.
- Replacing the mirror entirely with a hard interruption panel when exact mirroring is lost.
- Context-preserving adaptation quality, which belongs to Phase 7.
- Replay/export evidence work, which belongs to Phase 8.

</deferred>

---

*Phase: 06-researcher-live-mirror-session-operations*
*Context gathered: 2026-03-31*
