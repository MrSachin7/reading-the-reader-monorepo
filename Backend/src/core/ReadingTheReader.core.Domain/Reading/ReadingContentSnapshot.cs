namespace ReadingTheReader.core.Domain.Reading;

public sealed record ReadingContentSnapshot(
    string DocumentId,
    string Title,
    string Markdown,
    string? SourceSetupId,
    long UpdatedAtUnixMs)
{
    public bool UsesSavedSetup => !string.IsNullOrWhiteSpace(SourceSetupId);

    public ReadingContentSnapshot Copy()
    {
        return this with { };
    }
}
