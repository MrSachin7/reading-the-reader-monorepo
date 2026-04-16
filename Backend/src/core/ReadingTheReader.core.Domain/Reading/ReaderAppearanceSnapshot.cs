namespace ReadingTheReader.core.Domain.Reading;

public sealed record ReaderAppearanceSnapshot(
    string ThemeMode,
    string Palette,
    string AppFont)
{
    public static ReaderAppearanceSnapshot Default { get; } = new(
        "light",
        "default",
        "roboto-flex");

    public ReaderAppearanceSnapshot Copy()
    {
        return this with { };
    }
}
