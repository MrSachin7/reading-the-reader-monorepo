namespace ReadingTheReader.core.Domain.Reading;

public sealed record ReaderAppearanceSnapshot(
    string ThemeMode,
    string Palette,
    string AppFont)
{
    public static ReaderAppearanceSnapshot Default { get; } = new(
        "light",
        "default",
        "geist");

    public ReaderAppearanceSnapshot Copy()
    {
        return this with { };
    }
}
