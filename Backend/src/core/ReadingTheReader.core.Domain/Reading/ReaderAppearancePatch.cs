namespace ReadingTheReader.core.Domain.Reading;

public sealed record ReaderAppearancePatch(
    string? ThemeMode,
    string? Palette,
    string? AppFont);
