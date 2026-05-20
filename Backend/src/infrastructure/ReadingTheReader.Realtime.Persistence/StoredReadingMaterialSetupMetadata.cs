namespace ReadingTheReader.Realtime.Persistence;

internal sealed class StoredReadingMaterialSetupMetadata
{
    public string Id { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public List<StoredComprehensionQuestion> ComprehensionQuiz { get; init; } = [];
    public string FileName { get; init; } = string.Empty;
    public long CreatedAtUnixMs { get; init; }
    public long UpdatedAtUnixMs { get; init; }
    public string FontFamily { get; init; } = string.Empty;
    public int FontSizePx { get; init; }
    public int LineWidthPx { get; init; }
    public double LineHeight { get; init; }
    public double LetterSpacingEm { get; init; }
    public bool EditableByExperimenter { get; init; }
}

internal sealed class StoredComprehensionQuestion
{
    public string Id { get; init; } = string.Empty;
    public int Order { get; init; }
    public string Prompt { get; init; } = string.Empty;
    public List<StoredComprehensionOption> Options { get; init; } = [];
    public string CorrectOptionId { get; init; } = string.Empty;
}

internal sealed class StoredComprehensionOption
{
    public string Id { get; init; } = string.Empty;
    public string Text { get; init; } = string.Empty;
}
