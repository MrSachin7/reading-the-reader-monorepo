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
            foreach (var resolved in resolvedAnswers)
            {
                RecordQuizAnswerEvent(new QuizAnswerRecord(
                    NextSequenceNumber(),
                    resolved.AnsweredAtUnixMs,
                    item.Id,
                    materialRunId,
                    currentIndexForRecord,
                    resolved.QuestionId,
                    resolved.SelectedOptionId,
                    resolved.IsCorrect));
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

            _liveReadingSession = _liveReadingSession with
            {
                ExperimentItems = updatedItems,
                CurrentExperimentItemIndex = nextIndex,
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
    IReadOnlyList<SubmitQuizAnswerEntry> Answers);

public sealed record SubmitQuizAnswerEntry(
    string QuestionId,
    string SelectedOptionId);
