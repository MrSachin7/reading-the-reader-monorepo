namespace ReadingTheReader.WebApi.Contracts.ExperimentSession;

public sealed class SubmitQuizAnswersRequest
{
    public string MaterialItemId { get; set; } = string.Empty;
    public List<QuizAnswerEntryDto> Answers { get; set; } = [];
}

public sealed class QuizAnswerEntryDto
{
    public string QuestionId { get; set; } = string.Empty;
    public string SelectedOptionId { get; set; } = string.Empty;
}
