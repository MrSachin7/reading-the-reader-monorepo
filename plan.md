# Comprehension Quiz Feature — Implementation Plan

## Summary

Replace the unused `researcherQuestions: string` textarea with a structured **Comprehension Quiz** feature: each `ReadingMaterial` owns an ordered list of multiple-choice questions (one correct option each) shown to the reader between materials and after the final material. Reader answers are captured for export; reader sees only a neutral acknowledgement screen.

## Decisions (locked)

| Decision | Choice |
|---|---|
| Feature name | **Comprehension Quiz** (`comprehensionQuiz` / `ComprehensionQuiz` in code) |
| Data ownership | Questions belong to `ReadingMaterial` only. `ExperimentSetupItem` references the material and inherits its quiz. |
| Trigger | Reader advances past the last page of a material → quiz screen replaces the reader view → on submit, next material loads (or session ends). |
| Reader feedback | Neutral "Thank you" screen. No score, no correctness shown. |
| Question type (v1) | Single-correct multiple choice only. Structure designed to allow future types (multi-select, free text) without rework. |

## Data Model

### Domain (backend, `Backend/src/core/ReadingTheReader.core.Domain/`)

```csharp
public sealed record ComprehensionQuestion
{
    public required string Id { get; init; }           // stable GUID, generated on create
    public required string Prompt { get; init; }
    public required IReadOnlyList<ComprehensionOption> Options { get; init; }
    public required string CorrectOptionId { get; init; }
    public int Order { get; init; }
}

public sealed record ComprehensionOption
{
    public required string Id { get; init; }
    public required string Text { get; init; }
}

public sealed record ComprehensionAnswer
{
    public required string QuestionId { get; init; }
    public required string SelectedOptionId { get; init; }
    public required bool IsCorrect { get; init; }
    public required DateTimeOffset AnsweredAt { get; init; }
}
```

Validation rules (enforced in application service):
- Question must have ≥2 options.
- `CorrectOptionId` must match an option `Id` in the same question.
- Option text and prompt non-empty after trim.
- Material can have 0 questions (quiz screen is then skipped entirely).

### ReadingMaterialSetup changes

- **Remove** `ResearcherQuestions: string`.
- **Add** `ComprehensionQuiz: IReadOnlyList<ComprehensionQuestion>` (default empty).

### ExperimentSetupItem changes

- **Remove** `ResearcherQuestions: string`.
- Quiz is read from the referenced `ReadingMaterial`; no per-item override in v1.

### Migration

This is a research-stage project with no real production data and the field is never read by anything functional. **Drop the field cleanly** — no shim, no compatibility layer. Update the few seed/sample files in place.

## Backend Changes

### Contracts (`Backend/src/ReadingTheReader.WebApi/Contracts/`)

- `ReadingMaterialSetups/SaveReadingMaterialSetupRequest`, `UpdateReadingMaterialSetupRequest`: swap `researcherQuestions` for `comprehensionQuiz: ComprehensionQuestionDto[]`.
- `ExperimentSetups/*ExperimentSetupItem*`: drop `researcherQuestions`.
- New contract: `ExperimentSession/SubmitQuizAnswersRequest` (sessionId, materialItemId, answers: `{ questionId, selectedOptionId }[]`).

### Application layer (`Backend/src/core/ReadingTheReader.core.Application/`)

- `ReadingMaterialSetupService`: validate quiz on save/update (rules above). Throw `ReadingMaterialSetupValidationException` on failure.
- `ExperimentSessionManager`:
  - Extend `ExperimentSequenceItemSnapshot` with `ComprehensionQuiz` (server's canonical copy of the questions at session-start, so mid-session edits to materials don't shift the experiment).
  - Extend per-item state with `QuizStatus` (`NotStarted` / `InProgress` / `Completed`) and `QuizAnswers`.
  - New method: `SubmitQuizAnswersAsync(itemId, answers)` — marks item complete, records answers, advances session pointer to next material (or finishes session if last).
- New interface + adapter: `IQuizAnswerStoreAdapter` for persistence of answers tied to a session (in-memory + file checkpoint, mirroring existing pattern).

### Endpoints (`Backend/src/ReadingTheReader.WebApi/`)

- New: `ExperimentSessionEndpoints/SubmitQuizAnswersEndpoint` (`POST /experiment-session/quiz-answers`).
- Existing material/experiment-setup endpoints: updated request shapes.

### Realtime

- The quiz screen state is driven by the existing `ExperimentSessionSnapshot` broadcast — when `QuizStatus` flips, the reader UI reacts.
- No new WebSocket message type needed for v1. Answer submission goes over REST since it's a discrete, non-realtime action.

### Export

- `ExperimentReplayExportSerializer` (CsvHelper): add a `quiz-answers.csv` to the export bundle with columns `sessionId, materialItemId, questionId, prompt, selectedOptionId, selectedOptionText, correctOptionId, isCorrect, answeredAt`.

## Frontend Changes

### Types & API (`Frontend/src/redux/api/`, `Frontend/src/lib/`)

- New shared types in a new file `Frontend/src/lib/comprehension-quiz.ts`: `ComprehensionQuestion`, `ComprehensionOption`, `ComprehensionAnswer`.
- Update `reading-material-api.ts` and `experiment-setup-api.ts` types to drop `researcherQuestions` and add `comprehensionQuiz`.
- Update `experiment-session-api.ts`: add `useSubmitQuizAnswersMutation`.
- Update `Frontend/src/lib/experiment-session.ts` to mirror the new snapshot fields (`comprehensionQuiz`, `quizStatus`, `quizAnswers`).

### Redux slice

- `experiment-slice.ts`:
  - Remove `setReadingSessionResearcherQuestions`.
  - Replace `readingSession.researcherQuestions: string` with `readingSession.comprehensionQuiz: ComprehensionQuestion[]`.
  - Add actions: `setComprehensionQuiz`, `upsertQuestion`, `removeQuestion`, `reorderQuestions`, `upsertOption`, `removeOption`, `setCorrectOption`.

### Setup UI (researcher) — `reading-material-setup/index.tsx`

Replace the existing textarea with a new component `ComprehensionQuizEditor` (`Frontend/src/modules/pages/reading-material-setup/components/ComprehensionQuizEditor.tsx`).

Layout:
- Section heading: "Comprehension quiz" with helper text: "Questions shown to the reader after they finish this material."
- Empty state: "No questions yet" + `Add question` button.
- Per-question card (collapsible, drag handle on left):
  - Question number + drag handle + delete button.
  - Prompt textarea (auto-grow).
  - Options list:
    - Each row: radio (mark correct) + text input + remove button.
    - Min 2 options enforced; min 1 marked correct enforced.
    - `Add option` button below the list.
  - Inline validation: red border + message below field on save attempt with empty prompt / no correct option / <2 options.
- `Add question` button at the bottom of the list.

Why one-question-per-card with radio-for-correct: the radio doubles as a strong visual signal of "exactly one correct option," matching the v1 constraint and keeping the editing affordance compact.

### Experiment Setup UI — `experiment-setup/index.tsx`

- Drop the per-item `Researcher questions` textarea.
- Add a small read-only badge per item: `Quiz: N question(s)` (or `No quiz`) sourced from the referenced material. Clicking it opens the material in a new tab for editing. Keeps experiment-setup focused on sequencing rather than authoring.

### Reader Quiz UI — new module `Frontend/src/modules/pages/reading/quiz/`

Triggered when reader clicks "next" on the last page of a material AND that material has ≥1 question. Renders inside the existing reader shell route (`(without-sidebar)/reading`), replacing the reading content, not a separate URL.

- `QuizScreen.tsx` — orchestrator. Reads quiz from session snapshot, owns selected-option state per question.
- One question at a time, with:
  - Header: `Question {n} of {total}` + linear progress bar.
  - Prompt rendered in the same typographic scale as reading content.
  - Options as large clickable cards (radio semantics; keyboard accessible — arrow keys + space).
  - `Back` button (disabled on Q1) and `Next` button (disabled until an option is selected).
  - On final question, `Next` becomes `Submit`.
- On submit: POST answers → wait for snapshot update → if next material exists, reader view transitions to the next material's page 1; if last, show `ThankYouScreen` (neutral message, no score, no correctness).
- Loading + error states: if submit fails, show inline retry — answers stay selected locally.

### Researcher monitor

- `researcher/current-live/index.tsx`: show quiz state in the live monitor — "Reader is on Question 2 of 5" or "Quiz complete (4/5 correct)". Researcher sees the score for their own monitoring; reader does not.
- Stretch: show the participant's selected option in real time. Defer to v2 if it bloats scope.

## Phasing

**Phase 1 — Data model & contracts**
- Domain types, contract DTOs, validation, store adapter, snapshot extension.
- Drop the old `researcherQuestions` field everywhere.
- Acceptance: backend builds and existing tests pass; new validation unit tests pass.

**Phase 2 — Setup UI (researcher authoring)**
- `ComprehensionQuizEditor` component, wired into reading material setup.
- Experiment-setup item shows the read-only quiz badge.
- Acceptance: researcher can author, edit, reorder, and persist a quiz on a material; reloads correctly.

**Phase 3 — Reader quiz flow**
- `QuizScreen` + thank-you screen + integration with the reader page transition.
- Submit endpoint wired end-to-end through `ExperimentSessionManager`.
- Acceptance: full session run with two materials, each with a quiz, advances correctly material → quiz → material → quiz → thank-you.

**Phase 4 — Persistence & export**
- Checkpoint quiz answers in the file-backed store.
- `quiz-answers.csv` added to replay export bundle.
- Researcher live monitor displays quiz progress and score.
- Acceptance: ending a session produces an export with the answers; restarting the host mid-session restores quiz state for in-progress items.

## Open questions for later (not blocking)

- Should questions support markdown in the prompt (for italics, code, formulas)? Probably yes — easy if we already render the reading content as markdown. Defer until a researcher asks.
- Per-experiment overrides to a material's quiz (e.g., same material, different questions in two studies). Punt to v2.
- Time limits per question / per quiz. Not requested.
- Free-text and multi-select question types. The data model leaves room (`Options` + `CorrectOptionId` could generalize to `CorrectOptionIds: string[]` and a `Type` discriminator) but v1 ships single-select only.

## Files touched (rough census)

Backend: ~15 files (domain types, application service, snapshot, session manager, store adapter, 1 new endpoint, 4 contract files, export serializer, module installers, sample data).

Frontend: ~12 files (1 new lib type file, 1 new editor component, 1 new quiz module with ~4 components, 2 API files, 1 slice, 2 setup pages, reader page, current-live monitor).

---

# Phase 5 — Quiz as a first-class replay citizen

Phases 1–4 made the quiz work end-to-end and ship answers in the export. The replay player, however, treats the quiz period as dead air: stale reading content stays on screen, gaze drifts over text the participant isn't actually looking at, and there's no way to see which options were considered or how long each question took.

Phase 5 fixes that by instrumenting the quiz screen the same way the reader is instrumented, then teaching the replay player to render the quiz back from the recording.

## Decisions (locked)

| Decision | Choice |
|---|---|
| Gaze granularity | Region-level: each option and the prompt is a region; gaze focus events fire when the active region changes |
| Selection recording | Every selection change is its own event; replay can scrub through hesitation |
| Per-answer timing | Bundled into Phase 5.1 — enriched `ComprehensionAnswer` carries `firstSelectedAtUnixMs`, `lastSelectedAtUnixMs`, `selectionChangeCount`, `questionShownAtUnixMs` |
| Replay player | In scope — Phase 5.2 reconstructs the quiz UI from recorded layout, replays gaze on top |

## Architectural principle

The reading pipeline already does "what is the participant looking at?" attribution against bounded regions (tokens). Phase 5 generalises that pipeline to also know about quiz regions, rather than building a parallel system. The same gaze samples flow through the same flush pipeline; only the attribution target differs depending on what screen is mounted.

## New event streams

### `QuizLifecycleEvent`
Coarse timeline markers. Emitted on:
- `quiz-started` — payload: `{ materialItemId, questionCount, startedAtUnixMs }`
- `quiz-question-shown` — payload: `{ materialItemId, questionId, questionIndex, prompt, layout: { promptBbox, optionBboxes: [{ optionId, x, y, width, height }] } }`. The bbox is in viewport coordinates, captured the moment the question becomes visible (and on resize).
- `quiz-question-left` — payload: `{ materialItemId, questionId, direction: "back" | "next" }`. Closes the dwell window for that question render.
- `quiz-submitted` — payload: `{ materialItemId }`. Already implied by the existing `quiz-answers-submitted` reading-session-state record; this is the explicit lifecycle marker for the timeline.

### `QuizFocusEvent`
Mirror of `ReadingFocusEventRecord`. Fires when the active quiz region changes. Payload: `{ materialItemId, questionId, activeRegionType: "prompt" | "option" | "outside" | "none", activeOptionId?, occurredAtUnixMs }`. Coalesced — only emitted on region transitions, not per sample.

### `QuizSelectionEvent`
Fires on every selection change inside the active question. Payload: `{ materialItemId, questionId, selectedOptionId, occurredAtUnixMs }`. Multiple events per question are expected; the last one before submit is the final answer.

### Enriched `ComprehensionAnswer`
Adds derived per-answer telemetry computed at submit time from the in-memory selection-history accumulator:
- `questionShownAtUnixMs` — first time this question was rendered in this attempt
- `firstSelectedAtUnixMs` — first selection (any option) for this question
- `lastSelectedAtUnixMs` — final selection before submit
- `selectionChangeCount` — total number of selection events for this question (0 if user never changed after first pick)

Computed locally by `SubmitQuizAnswersAsync` from the accumulator — no extra round-trip required.

## Phase 5.1 — Instrumentation & persistence

### Frontend (`QuizScreen` and a new hook)

- New hook `useQuizRegionTracker(questionId, options)`:
  - Owns refs for the prompt container and each option card
  - On mount, on `questionId` change, and on `window.resize`, computes viewport-relative bboxes via `getBoundingClientRect()` and emits `quiz-question-shown`
  - Subscribes to the same gaze stream `useGazeTokenHighlight` uses, but applies its own hit-test: which bbox contains `(gaze.x, gaze.y)`?
  - On region change, dispatches a `QuizFocusEvent` (debounced the same way reading focus is)
- `QuizScreen` wraps the existing selection handler to emit `QuizSelectionEvent` and maintains a local selection-history map (per `questionId`)
- On `Back`/`Next`/`Submit`: emit `quiz-question-left`
- On submit: include the selection history alongside the answers in the submit command

### Backend

- New realtime commands (over WebSocket, paralleling `update-reading-focus`):
  - `submit-quiz-lifecycle-event` (subtype field for the four lifecycle kinds)
  - `submit-quiz-focus-event`
  - `submit-quiz-selection-event`
- New manager methods on `ExperimentSessionManager.Quiz.cs`:
  - `RecordQuizLifecycleAsync`, `RecordQuizFocusAsync`, `RecordQuizSelectionAsync`
  - Each pushes a record to a dedicated pending list (`_pendingQuizLifecycleEvents`, `_pendingQuizFocusEvents`, `_pendingQuizSelectionEvents`)
  - Each sets `_hasPendingReplayPersistence = true`
- `SubmitQuizAnswersAsync` extended:
  - Accepts a `Dictionary<string, QuizSelectionHistory>` (questionId → history) in the command
  - Computes the enriched `ComprehensionAnswer` fields from the history
  - If history is missing (e.g. older client), fields default to `null` — graceful
- `FlushPendingReplayChunksCoreAsync` drains the three new lists into the chunk batch
- `ExperimentReplayRecoveryChunkBatch` gains `QuizLifecycleEvents`, `QuizFocusEvents`, `QuizSelectionEvents` (defaulted `null` for compatibility)

### Persistence

- `RecoveryChunkData` (file store) and `InMemoryRecoveryState` gain the three new arrays
- `BuildExportAsync` merges them into the export's `Quiz` section, which grows to:
  ```
  ExperimentReplayQuiz {
    Answers: QuizAnswerRecord[]          // existing
    LifecycleEvents: QuizLifecycleRecord[]   // new
    FocusEvents: QuizFocusRecord[]            // new
    SelectionEvents: QuizSelectionRecord[]   // new
  }
  ```

### CSV export

New row types alongside the existing `quiz-answer`:
- `quiz-lifecycle` — one row per lifecycle event (`EventType` = kind, `Source` = questionId)
- `quiz-focus` — one row per region transition
- `quiz-selection` — one row per selection change
- `quiz-answer` rows gain `MetricValue = (lastSelectedAtUnixMs - questionShownAtUnixMs)` as a convenience time-to-answer column

### Acceptance for 5.1
- A full session produces an export where, for each quiz question, you can reconstruct: when it was shown, every option the user looked at and for how long, every selection change, and the final answer with derived timing.
- Live researcher monitor is unaffected (still shows status only).

## Phase 5.2 — Replay player quiz reconstruction

### Reader-side rendering during replay

- Extend the frontend `ExperimentReplayExport` type to include the new `quiz` event streams
- New replay state: between a `quiz-started` and the matching `quiz-submitted` (or session end), the player is in "quiz mode"
- `ReplayQuizPanel` component:
  - Reads the most recent `quiz-question-shown` event with `occurredAt <= currentReplayTimeMs`
  - Renders the prompt + options in their recorded bboxes — exact pixel positions from the recording (so the gaze overlay maps correctly)
  - Highlights the option matching the most recent `QuizSelectionEvent` for the current question
  - Replays the gaze overlay on top using the same `RawGazeSampleRecord` stream the reader replay uses — no separate sample pool needed
  - Side panel shows per-question metrics derived live from the recording: time-on-question, options-considered, selection-change-count, ✓/✗ correctness
- Timeline: `QuizLifecycleEvent` timestamps become scrubber waypoints (with small markers); user can click "next question" to jump
- When quiz exits (`quiz-submitted`), player resumes the normal reader view for the next material

### Why bbox-from-recording rather than re-rendering from layout rules

The participant's screen size, browser zoom, and CSS state at recording time are fixed. Replaying gaze against a "re-laid-out" quiz UI would put the dot in the wrong place when the analyst's screen differs from the participant's. Using the recorded bboxes makes gaze attribution faithful to the original session.

### Acceptance for 5.2
- Scrubbing through the quiz period shows the quiz UI with the actual prompt, options, and gaze overlay drifting over them
- The selected option highlights and changes as the participant's selections changed
- Side panel updates per-question dwell counters as time advances
- Skipping the quiz period works — clicking the next material's marker jumps past the quiz

## Phasing rationale

5.1 is unblock-everything: once it lands, every recorded session is rich enough for offline analysis via CSV/JSON, even before the player UI exists. 5.2 is then pure UI work against a solid recording.

## Known follow-ons (not in 5.1 or 5.2)

- Saccade analysis over quiz regions (where the eye jumped between options)
- Heat map per option per material across multiple participants
- "Confidence proxy" metric — `selectionChangeCount` + time-to-first-selection as a derived feature in researcher dashboards
- Quiz analytics page (aggregate, multi-session) — separate feature

## Files touched (rough census for Phase 5)

**Phase 5.1**:
- Backend: ~8 files (3 new event records, manager partial extension, recovery contracts, both store adapters, factory, serializer)
- Frontend: ~6 files (new `useQuizRegionTracker` hook, `QuizScreen` instrumentation, new gaze-socket commands, lib types, submit payload type, redux mutation)

**Phase 5.2**:
- Frontend only: ~8 files (`ReplayQuizPanel` + sub-components, replay player integration, type extensions, timeline marker rendering, side-panel metrics)
