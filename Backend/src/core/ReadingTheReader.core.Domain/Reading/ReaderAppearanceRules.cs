namespace ReadingTheReader.core.Domain.Reading;

public static class ReaderAppearanceRules
{
    public static ReaderAppearanceSnapshot Normalize(ReaderAppearanceSnapshot? snapshot)
    {
        var source = snapshot ?? ReaderAppearanceSnapshot.Default;

        return new ReaderAppearanceSnapshot(
            NormalizeThemeMode(source.ThemeMode),
            NormalizePalette(source.Palette),
            ReadingPresentationRules.NormalizeFontFamily(source.AppFont));
    }

    public static string NormalizeThemeMode(string? themeMode)
    {
        return string.Equals(themeMode?.Trim(), "dark", StringComparison.OrdinalIgnoreCase)
            ? "dark"
            : ReaderAppearanceSnapshot.Default.ThemeMode;
    }

    public static string NormalizePalette(string? palette)
    {
        if (string.Equals(palette?.Trim(), "sepia", StringComparison.OrdinalIgnoreCase))
        {
            return "sepia";
        }

        if (string.Equals(palette?.Trim(), "high-contrast", StringComparison.OrdinalIgnoreCase))
        {
            return "high-contrast";
        }

        return ReaderAppearanceSnapshot.Default.Palette;
    }
}
