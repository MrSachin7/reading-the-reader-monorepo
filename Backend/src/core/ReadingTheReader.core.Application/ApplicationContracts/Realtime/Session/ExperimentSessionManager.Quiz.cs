using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Messaging;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Reading;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Replay;
using ReadingTheReader.core.Domain.Reading;


namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;

public sealed partial class ExperimentSessionManager
{
    private readonly Dictionary<string, IReadOnlyList<ComprehensionAnswer>> _quizAnswersByItemId = new(StringComparer.Ordinal);

    public async ValueTask<LiveReadingSessionSnapshot> SubmitQuizAnswersAsync(
        SubmitQuizAnswersCommand command,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(command.MaterialItemId))
        {
            throw new InvalidOperationException("materialItemId is required.");
        }

        LiveReadingSessionSnapshot nextState;

        await _lifecycleGate.WaitAsync(ct);
        try
        {
            var experimentItems = _liveReadingSession.ExperimentItems ?? Array.Empty<ExperimentSequenceItemSnapshot>();
            var item = experimentItems.FirstOrDefault(
                candidate => string.Equals(candidate.Id, command.MaterialItemId, StringComparison.Ordinal));

            if (item is null)
            {
                throw new InvalidOperationException($"Experiment item '{command.MaterialItemId}' is not in the current session.");
            }

            var quiz = item.ComprehensionQuiz;
            if (quiz is null || quiz.Count == 0)
            {
                throw new InvalidOperationException($"Experiment item '{command.MaterialItemId}' has no comprehension quiz.");
            }

            if (string.Equals(item.QuizStatus, QuizStatuses.Completed, StringComparison.Ordinal))
            {
                throw new InvalidOperationException($"Quiz for experiment item '{command.MaterialItemId}' has already been submitted.");
            }

            var answeredAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            var resolvedAnswers = ResolveAnswers(quiz, command.Answers ?? [], answeredAtUnixMs);

            _quizAnswersByItemId[item.Id] = resolvedAnswers;

            var currentIndexForRecord = _liveReadingSession.CurrentExperimentItemIndex;
            var materialRunId = string.IsNullOrWhiteSpace(item.MaterialRunId) ? item.Id : item.MaterialRunId;
            var histories = command.SelectionHistories;
            foreach (var resolved in resolvedAnswers)
            {
                QuizSelectionHistoryEntry? history = null;
                if (histories is not null && histories.TryGetValue(resolved.QuestionId, out var found))
                {
                    history = found;
                }

                RecordQuizAnswerEvent(new QuizAnswerRecord(
                    NextSequenceNumber(),
                    resolved.AnsweredAtUnixMs,
                    item.Id,
                    materialRunId,
                    currentIndexForRecord,
                    resolved.QuestionId,
                    resolved.SelectedOptionId,
                    resolved.IsCorrect,
                    history?.QuestionShownAtUnixMs,
                    history?.FirstSelectedAtUnixMs,
                    history?.LastSelectedAtUnixMs,
                    history?.SelectionChangeCount));
            }

            var updatedItems = experimentItems
                .Select(candidate => candidate.Id == item.Id
                    ? candidate with { QuizStatus = QuizStatuses.Completed }
                    : candidate)
                .ToArray();

            var currentIndex = _liveReadingSession.CurrentExperimentItemIndex;
            int? nextIndex = currentIndex;
            if (currentIndex.HasValue &&
                currentIndex.Value < updatedItems.Length &&
                string.Equals(updatedItems[currentIndex.Value].Id, item.Id, StringComparison.Ordinal) &&
                currentIndex.Value + 1 < updatedItems.Length)
            {
                nextIndex = currentIndex.Value + 1;
            }

            var answersProjection = _quizAnswersByItemId.ToDictionary(
                pair => pair.Key,
                pair => (IReadOnlyList<ComprehensionAnswer>)pair.Value.Select(answer => answer with { }).ToArray(),
                StringComparer.Ordinal);

            _liveReadingSession = _liveReadingSession with
            {
                ExperimentItems = updatedItems,
                CurrentExperimentItemIndex = nextIndex,
                ActiveQuizState = null,
                QuizAnswersByItemId = answersProjection,
            };

            nextState = _liveReadingSession.Copy();
            RecordReadingSessionState("quiz-answers-submitted", answeredAtUnixMs, nextState);
            await SaveCurrentCheckpointAsync(ct);
        }
        finally
        {
            _lifecycleGate.Release();
        }

        await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.ReadingSessionChanged, nextState, ct);
        return nextState;
    }

    public IReadOnlyDictionary<string, IReadOnlyList<ComprehensionAnswer>> GetQuizAnswersSnapshot()
    {
        lock (_quizAnswersByItemId)
        {
            return _quizAnswersByItemId.ToDictionary(pair => pair.Key, pair => pair.Value, StringComparer.Ordinal);
        }
    }

    public async ValueTask<LiveReadingSessionSnapshot> StartActiveQuizAsync(string materialItemId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(materialItemId))
        {
            throw new InvalidOperationException("materialItemId is required.");
        }

        LiveReadingSessionSnapshot nextState;
        await _lifecycleGate.WaitAsync(ct);
        try
        {
            var item = RequireQuizItem(materialItemId);
            if (string.Equals(item.QuizStatus, QuizStatuses.Completed, StringComparison.Ordinal))
            {
                throw new InvalidOperationException($"Quiz for experiment item '{materialItemId}' has already been submitted.");
            }

            var alreadyActive = _liveReadingSession.ActiveQuizState is not null
                && string.Equals(_liveReadingSession.ActiveQuizState.MaterialItemId, materialItemId, StringComparison.Ordinal);
            if (alreadyActive)
            {
                nextState = _liveReadingSession.Copy();
            }
            else
            {
                var nextActiveQuizState = new ActiveQuizState(
                    materialItemId,
                    0,
                    new Dictionary<string, string>(StringComparer.Ordinal),
                    QuizPhases.InProgress);
                _liveReadingSession = _liveReadingSession with { ActiveQuizState = nextActiveQuizState };
                nextState = _liveReadingSession.Copy();
                await SaveCurrentCheckpointAsync(ct);
            }
        }
        finally
        {
            _lifecycleGate.Release();
        }

        await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.ReadingSessionChanged, nextState, ct);
        return nextState;
    }

    public ValueTask<LiveReadingSessionSnapshot> AdvanceActiveQuizQuestionAsync(string materialItemId, CancellationToken ct = default)
    {
        return ShiftActiveQuizQuestionAsync(materialItemId, +1, ct);
    }

    public ValueTask<LiveReadingSessionSnapshot> RetreatActiveQuizQuestionAsync(string materialItemId, CancellationToken ct = default)
    {
        return ShiftActiveQuizQuestionAsync(materialItemId, -1, ct);
    }

    public async ValueTask<LiveReadingSessionSnapshot> SetActiveQuizSelectionAsync(
        string materialItemId,
        string questionId,
        string selectedOptionId,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(materialItemId))
        {
            throw new InvalidOperationException("materialItemId is required.");
        }
        if (string.IsNullOrWhiteSpace(questionId))
        {
            throw new InvalidOperationException("questionId is required.");
        }
        if (string.IsNullOrWhiteSpace(selectedOptionId))
        {
            throw new InvalidOperationException("selectedOptionId is required.");
        }

        LiveReadingSessionSnapshot nextState;
        await _lifecycleGate.WaitAsync(ct);
        try
        {
            var item = RequireQuizItem(materialItemId);
            var question = item.ComprehensionQuiz!.FirstOrDefault(
                candidate => string.Equals(candidate.Id, questionId, StringComparison.Ordinal));
            if (question is null)
            {
                throw new InvalidOperationException($"questionId '{questionId}' is not part of this material's quiz.");
            }
            if (!question.Options.Any(option => string.Equals(option.Id, selectedOptionId, StringComparison.Ordinal)))
            {
                throw new InvalidOperationException($"selectedOptionId '{selectedOptionId}' is not a valid option for question '{questionId}'.");
            }

            var current = _liveReadingSession.ActiveQuizState;
            if (current is null || !string.Equals(current.MaterialItemId, materialItemId, StringComparison.Ordinal))
            {
                throw new InvalidOperationException($"There is no active quiz for experiment item '{materialItemId}'.");
            }

            var nextSelections = new Dictionary<string, string>(current.SelectionsByQuestionId, StringComparer.Ordinal)
            {
                [questionId] = selectedOptionId,
            };

            _liveReadingSession = _liveReadingSession with
            {
                ActiveQuizState = current with { SelectionsByQuestionId = nextSelections },
            };
            nextState = _liveReadingSession.Copy();
            await SaveCurrentCheckpointAsync(ct);
        }
        finally
        {
            _lifecycleGate.Release();
        }

        await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.ReadingSessionChanged, nextState, ct);
        return nextState;
    }

    private async ValueTask<LiveReadingSessionSnapshot> ShiftActiveQuizQuestionAsync(string materialItemId, int delta, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(materialItemId))
        {
            throw new InvalidOperationException("materialItemId is required.");
        }

        LiveReadingSessionSnapshot nextState;
        await _lifecycleGate.WaitAsync(ct);
        try
        {
            var item = RequireQuizItem(materialItemId);
            var current = _liveReadingSession.ActiveQuizState;
            if (current is null || !string.Equals(current.MaterialItemId, materialItemId, StringComparison.Ordinal))
            {
                throw new InvalidOperationException($"There is no active quiz for experiment item '{materialItemId}'.");
            }

            var quizLength = item.ComprehensionQuiz!.Count;
            var nextIndex = current.ActiveQuestionIndex + delta;
            if (nextIndex < 0 || nextIndex >= quizLength)
            {
                // No-op when out of bounds; just rebroadcast current state for idempotency.
                nextState = _liveReadingSession.Copy();
            }
            else
            {
                _liveReadingSession = _liveReadingSession with
                {
                    ActiveQuizState = current with { ActiveQuestionIndex = nextIndex },
                };
                nextState = _liveReadingSession.Copy();
                await SaveCurrentCheckpointAsync(ct);
            }
        }
        finally
        {
            _lifecycleGate.Release();
        }

        await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.ReadingSessionChanged, nextState, ct);
        return nextState;
    }

    private ExperimentSequenceItemSnapshot RequireQuizItem(string materialItemId)
    {
        var experimentItems = _liveReadingSession.ExperimentItems ?? Array.Empty<ExperimentSequenceItemSnapshot>();
        var item = experimentItems.FirstOrDefault(
            candidate => string.Equals(candidate.Id, materialItemId, StringComparison.Ordinal));
        if (item is null)
        {
            throw new InvalidOperationException($"Experiment item '{materialItemId}' is not in the current session.");
        }

        var quiz = item.ComprehensionQuiz;
        if (quiz is null || quiz.Count == 0)
        {
            throw new InvalidOperationException($"Experiment item '{materialItemId}' has no comprehension quiz.");
        }

        return item;
    }

    public ValueTask RecordQuizLifecycleEventAsync(QuizLifecycleEventCommand command, CancellationToken ct = default)
    {
        lock (_historyGate)
        {
            _pendingQuizLifecycleEvents.Add(new QuizLifecycleRecord(
                NextSequenceNumber(),
                command.OccurredAtUnixMs,
                command.MaterialItemId,
                command.EventType,
                command.QuestionCount,
                command.QuestionId,
                command.QuestionIndex,
                command.Prompt,
                command.Layout,
                command.Direction));
            _hasPendingReplayPersistence = true;
        }

        return ValueTask.CompletedTask;
    }

    public ValueTask RecordQuizFocusEventAsync(QuizFocusEventCommand command, CancellationToken ct = default)
    {
        lock (_historyGate)
        {
            _pendingQuizFocusEvents.Add(new QuizFocusRecord(
                NextSequenceNumber(),
                command.OccurredAtUnixMs,
                command.MaterialItemId,
                command.QuestionId,
                command.ActiveRegionType,
                command.ActiveOptionId));
            _hasPendingReplayPersistence = true;
        }

        return ValueTask.CompletedTask;
    }

    public ValueTask RecordQuizSelectionEventAsync(QuizSelectionEventCommand command, CancellationToken ct = default)
    {
        lock (_historyGate)
        {
            _pendingQuizSelectionEvents.Add(new QuizSelectionRecord(
                NextSequenceNumber(),
                command.OccurredAtUnixMs,
                command.MaterialItemId,
                command.QuestionId,
                command.SelectedOptionId));
            _hasPendingReplayPersistence = true;
        }

        return ValueTask.CompletedTask;
    }

    private void RecordQuizAnswerEvent(QuizAnswerRecord record)
    {
        lock (_historyGate)
        {
            _pendingQuizAnswerEvents.Add(record);
            _hasPendingReplayPersistence = true;
        }
    }

    private static IReadOnlyList<ComprehensionAnswer> ResolveAnswers(
        IReadOnlyList<ComprehensionQuestion> quiz,
        IReadOnlyList<SubmitQuizAnswerEntry> submitted,
        long answeredAtUnixMs)
    {
        var quizByQuestionId = quiz.ToDictionary(question => question.Id, StringComparer.Ordinal);
        var resolved = new List<ComprehensionAnswer>(submitted.Count);

        foreach (var entry in submitted)
        {
            if (string.IsNullOrWhiteSpace(entry.QuestionId))
            {
                throw new InvalidOperationException("answer.questionId is required.");
            }

            if (!quizByQuestionId.TryGetValue(entry.QuestionId, out var question))
            {
                throw new InvalidOperationException($"questionId '{entry.QuestionId}' is not part of this material's quiz.");
            }

            if (string.IsNullOrWhiteSpace(entry.SelectedOptionId))
            {
                throw new InvalidOperationException($"answer.selectedOptionId is required for question '{entry.QuestionId}'.");
            }

            if (!question.Options.Any(option => string.Equals(option.Id, entry.SelectedOptionId, StringComparison.Ordinal)))
            {
                throw new InvalidOperationException($"selectedOptionId '{entry.SelectedOptionId}' is not a valid option for question '{entry.QuestionId}'.");
            }

            var isCorrect = string.Equals(entry.SelectedOptionId, question.CorrectOptionId, StringComparison.Ordinal);
            resolved.Add(new ComprehensionAnswer(entry.QuestionId, entry.SelectedOptionId, isCorrect, answeredAtUnixMs));
        }

        return resolved;
    }
}

public sealed record SubmitQuizAnswersCommand(
    string MaterialItemId,
    IReadOnlyList<SubmitQuizAnswerEntry> Answers,
    IReadOnlyDictionary<string, QuizSelectionHistoryEntry>? SelectionHistories = null);

public sealed record SubmitQuizAnswerEntry(
    string QuestionId,
    string SelectedOptionId);

public sealed record QuizSelectionHistoryEntry(
    long? QuestionShownAtUnixMs,
    long? FirstSelectedAtUnixMs,
    long? LastSelectedAtUnixMs,
    int SelectionChangeCount);

public sealed record QuizLifecycleEventCommand(
    string MaterialItemId,
    string EventType,
    long OccurredAtUnixMs,
    int? QuestionCount = null,
    string? QuestionId = null,
    int? QuestionIndex = null,
    string? Prompt = null,
    QuizQuestionLayout? Layout = null,
    string? Direction = null);

public sealed record QuizFocusEventCommand(
    string MaterialItemId,
    string QuestionId,
    string ActiveRegionType,
    long OccurredAtUnixMs,
    string? ActiveOptionId = null);

public sealed record QuizSelectionEventCommand(
    string MaterialItemId,
    string QuestionId,
    string SelectedOptionId,
    long OccurredAtUnixMs);
