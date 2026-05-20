namespace ReadingTheReader.WebApi.Contracts;

public sealed class ComprehensionQuestionDto
{
    public string Id { get; set; } = string.Empty;
    public int Order { get; set; }
    public string Prompt { get; set; } = string.Empty;
    public List<ComprehensionOptionDto> Options { get; set; } = [];
    public string CorrectOptionId { get; set; } = string.Empty;
}

public sealed class ComprehensionOptionDto
{
    public string Id { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
}
