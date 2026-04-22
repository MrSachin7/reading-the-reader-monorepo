# Intervention Differences: Timing Modes in Reading the Reader

## Overview

Interventions are typography or appearance changes applied to a participant's reading view, triggered by the researcher from the live control page. When an intervention affects layout properties (font size, line width, line height, letter spacing), it may be held in a **pending** state and only committed to the reader at a specific reading boundary — or immediately, depending on the configured policy.

This document explains how each of the four timing modes works, what conditions must be met for an intervention to apply, and how they differ from each other.

---

## The Intervention Policy

The timing mode is part of the **intervention policy**, configured per session by the researcher. The relevant field is `layoutCommitBoundary`, which selects when a pending layout change is committed to the participant's view.

**File:** `Backend/src/core/ReadingTheReader.core.Domain/Reading/ReadingInterventionCommitBoundaries.cs`

```
Immediate      — apply the moment the researcher commits
SentenceEnd    — apply when the participant finishes the current sentence
ParagraphEnd   — apply when the participant finishes the current paragraph/block
PageTurn       — apply when the participant turns to the next page
```

The policy also has a **fallback boundary** and a **fallback timeout**: if the primary boundary has not been reached after `layoutFallbackAfterMs` milliseconds, the system can apply the intervention at the fallback boundary instead.

---

## What Causes an Intervention to Be Queued vs. Applied Immediately

Not every intervention goes through the queuing mechanism. The decision is made in `ShouldQueueIntervention()`:

**File:** `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Session/ExperimentSessionManager.Interventions.cs`

```
Does the intervention request any layout property changes?
  └─ No  → Apply immediately (layout boundary does not matter)
  └─ Yes → Is the configured boundary "immediate"?
             └─ Yes → Apply immediately
             └─ No  → Queue as pending and wait for the boundary
```

Interventions that only change the **appearance** (theme, color palette, app font) but not layout are never queued — they apply the instant the researcher commits them regardless of the policy.

**Layout properties** that trigger queuing:
- Font size (`fontSizePx`)
- Line width (`lineWidthPx`)
- Line height (`lineHeight`)
- Letter spacing (`letterSpacingEm`)

---

## The Four Timing Modes

### 1. Immediate

**Boundary constant:** `"immediate"`

The intervention is applied the moment the researcher commits it. No pending state is created. There is no wait.

**How the boundary is detected:**

The `DidBoundaryChange()` function returns `true` unconditionally for this mode:

```csharp
ReadingInterventionCommitBoundaries.Immediate => true
```

**When it fires:** Instantly, on the same call that receives the `applyIntervention` WebSocket message.

**Participant experience:** The reader's typography changes mid-sentence, mid-word, or at any arbitrary point during reading.

**Use case:** Urgent manual corrections where the researcher does not want to wait for a reading boundary.

---

### 2. Sentence End

**Boundary constant:** `"sentence-end"`

The intervention waits until the participant's gaze moves out of the current sentence into a different one.

**How the boundary is detected:**

```csharp
ReadingInterventionCommitBoundaries.SentenceEnd =>
    DidMeaningfulFocusBoundaryChange(
        previousMeaningfulFocus.ActiveSentenceId,
        currentMeaningfulFocus.ActiveSentenceId)
```

`DidMeaningfulFocusBoundaryChange()` returns `true` only when:
- Both the previous and current sentence ID are non-empty
- The two IDs are different

**Trigger source:** Every call to `UpdateReadingFocusAsync()`, which fires whenever the participant's gaze token or sentence changes.

**What "meaningful focus" means:** The system tracks a _meaningful focus_ snapshot separately from the raw gaze focus. A focus update is considered meaningful only when the participant actually lands on a new sentence ID (not a null or transient state). This prevents false triggers from brief saccades or noise.

**Participant experience:** The typography change takes effect precisely at the sentence boundary — the participant finishes reading one complete sentence with the old settings and begins the next sentence with the new settings. Disruption to the reading flow is minimized.

**Use case:** The most common "non-disruptive" timing for layout adjustments during a reading session.

---

### 3. Paragraph End

**Boundary constant:** `"paragraph-end"`

The intervention waits until the participant's gaze moves out of the current paragraph (block) into a different one.

**How the boundary is detected:**

```csharp
ReadingInterventionCommitBoundaries.ParagraphEnd =>
    DidMeaningfulFocusBoundaryChange(
        previousMeaningfulFocus.ActiveBlockId,
        currentMeaningfulFocus.ActiveBlockId)
```

The logic is identical to sentence end but compares `ActiveBlockId` (the paragraph/section identifier) instead of `ActiveSentenceId`.

**Trigger source:** Same as sentence end — `UpdateReadingFocusAsync()`.

**Participant experience:** The change takes effect only after the participant completes an entire paragraph. This is the least disruptive option for layout changes because multiple sentences elapse before any change is visible. However, if a paragraph is long, the researcher may wait considerably longer before the intervention is committed.

**Use case:** Experiments where natural paragraph breaks are the preferred points for adaptive adjustments, or where the researcher wants to ensure the reader has absorbed a complete thought before any change.

---

### 4. Page Turn

**Boundary constant:** `"page-turn"`

The intervention waits until the participant navigates to a different page of the reading material.

**How the boundary is detected:**

```csharp
ReadingInterventionCommitBoundaries.PageTurn =>
    previousViewport.ActivePageIndex != currentViewport.ActivePageIndex &&
    currentViewport.ActivePageIndex >= 0 &&
    currentViewport.PageCount > 0 &&
    currentViewport.LastPageTurnAtUnixMs.HasValue &&
    currentViewport.LastPageTurnAtUnixMs.Value >= queuedAtUnixMs
```

All five conditions must be true simultaneously:

| Condition | Purpose |
|---|---|
| `ActivePageIndex` changed | Confirms an actual page navigation occurred |
| `ActivePageIndex >= 0` | Guards against an invalid page state |
| `PageCount > 0` | Ensures the document actually has multiple pages |
| `LastPageTurnAtUnixMs` has a value | Ensures the backend has a recorded page-turn timestamp |
| `LastPageTurnAtUnixMs >= queuedAtUnixMs` | The page turn happened **after** the intervention was queued, not before |

The last condition is critical: it prevents a past page turn (that happened before the researcher committed the intervention) from accidentally triggering the application.

**Trigger source:** `UpdateParticipantViewportAsync()`, called whenever the participant's viewport or page changes. This is a different source from sentence/paragraph end — it originates from viewport updates, not focus tracking.

**Participant experience:** Typography is completely stable within a page. The entire page is read with consistent settings, and changes appear only at the page transition, which is already a natural interruption in the reading experience.

**Use case:** Experiments that want reading conditions to be uniform within a page, or that use page turns as the unit of analysis.

---

## Comparison Table

| Property | Immediate | Sentence End | Paragraph End | Page Turn |
|---|---|---|---|---|
| **Queued?** | Never | Yes | Yes | Yes |
| **Trigger source** | Direct on apply | Focus update | Focus update | Viewport update |
| **Wait condition** | None | `ActiveSentenceId` changes | `ActiveBlockId` changes | `ActivePageIndex` changes + timestamp guard |
| **Typical wait** | 0 ms | 1–10 seconds | 10–60 seconds | Minutes |
| **Disruption to reader** | High (mid-sentence) | Low (sentence boundary) | Very low (paragraph boundary) | Minimal (natural page break) |
| **Researcher control** | Instant | Near-real-time | Delayed | Coarse |
| **Multi-page documents required?** | No | No | No | Yes (`PageCount > 0`) |
| **Timestamp guard?** | No | No | No | Yes (rejects pre-existing page turns) |

---

## Guardrails That Apply After a Boundary Is Met

Meeting the boundary condition is necessary but not sufficient. `ApplyInterventionCore()` enforces two additional guards **for automatic (non-manual) interventions**:

### 1. Maximum Change Step

Each layout property has a maximum single-step change:

| Property | Maximum per intervention |
|---|---|
| Font size | 2 px |
| Line width | 40 px |
| Line height | 0.12 multiplier |
| Letter spacing | 0.02 em |

If the requested change exceeds the limit, the intervention is **suppressed** with reason `"change-too-large"`. The pending intervention is still marked as applied, but the reader's presentation does not change.

### 2. Cooldown

A 1 500 ms cooldown is enforced between successive layout changes for automatic interventions. If a second layout change arrives within the cooldown window, it is **suppressed** with reason `"cooldown-active"`.

Manual interventions committed directly by the researcher via the UI bypass both guardrails. The `source: "manual"` field on `ApplyInterventionCommand` is what controls this: the check `IsManualIntervention(command)` determines whether guardrails are skipped.

---

## State Lifecycle of a Pending Intervention

```
Researcher commits intervention
        │
        ▼
[queued] — Waiting for boundary
        │
        ├─→ New intervention committed before boundary met
        │         └─→ [superseded] — Replaced, old pending discarded
        │
        └─→ Boundary condition becomes true
                  └─→ [applied] — ResolutionReason = "boundary-met"
                        │
                        └─→ Guardrails check
                              ├─→ Pass → Reader typography updates
                              └─→ Fail → LatestLayoutGuardrail set to "suppressed"
```

If a new intervention is committed while one is already pending, the old one is superseded (`SupersedePendingInterventionIfQueued()`) and the new one is queued in its place.

---

## Key Files

| File | Role |
|---|---|
| `Backend/.../ExperimentSessionManager.Interventions.cs` | Core queuing, boundary detection, and application logic |
| `Backend/.../ExperimentSessionManager.ReadingSession.cs` | Focus and viewport update handlers that trigger boundary checks |
| `Backend/.../ReadingInterventionRuntime.cs` | Guardrail constants and layout change execution |
| `Backend/.../ReadingInterventionCommitBoundaries.cs` | Boundary string constants |
| `Backend/.../PendingInterventionSnapshot.cs` | Pending intervention state and status constants |
| `Frontend/.../LiveInterventionsColumn.tsx` | Researcher UI for committing interventions |
| `Frontend/.../experiment-session.ts` | Frontend TypeScript types mirroring backend snapshots |
| `Frontend/.../gaze-socket.ts` | `applyInterventionCommand()` — WebSocket dispatch |
| `Frontend/.../experiment-session-api.ts` | `updateInterventionPolicy`, `applyPendingInterventionNow` mutations |
