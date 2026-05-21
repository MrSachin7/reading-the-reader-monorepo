namespace ReadingTheReader.core.Domain.Reading;

public static class QuizPhases
{
    public const string InProgress = "in-progress";
    public const string Submitted = "submitted";
}

public sealed record ActiveQuizState(
    string MaterialItemId,
    int ActiveQuestionIndex,
    IReadOnlyDictionary<string, string> SelectionsByQuestionId,
    string QuizPhase)
{
    public ActiveQuizState Copy()
    {
        return new ActiveQuizState(
            MaterialItemId,
            ActiveQuestionIndex,
            SelectionsByQuestionId is null
                ? new Dictionary<string, string>(StringComparer.Ordinal)
                : SelectionsByQuestionId.ToDictionary(pair => pair.Key, pair => pair.Value, StringComparer.Ordinal),
            QuizPhase);
    }
}
