namespace ReadingTheReader.core.Domain.Reading;

public sealed record ComprehensionAnswer(
    string QuestionId,
    string SelectedOptionId,
    bool IsCorrect,
    long AnsweredAtUnixMs);

public static class QuizStatuses
{
    public const string NotStarted = "not-started";
    public const string Completed = "completed";
}
