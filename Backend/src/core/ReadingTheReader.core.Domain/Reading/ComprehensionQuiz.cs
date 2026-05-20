namespace ReadingTheReader.core.Domain.Reading;

public sealed record ComprehensionOption(
    string Id,
    string Text);

public sealed record ComprehensionQuestion(
    string Id,
    int Order,
    string Prompt,
    IReadOnlyList<ComprehensionOption> Options,
    string CorrectOptionId);
