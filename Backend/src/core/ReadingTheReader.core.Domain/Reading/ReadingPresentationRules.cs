namespace ReadingTheReader.core.Domain.Reading;

public static class ReadingPresentationRules
{
    public const int MinFontSizePx = 12;
    public const int MaxFontSizePx = 48;
    public const int MinLineWidthPx = 320;
    public const int MaxLineWidthPx = 1600;
    public const double MinLineHeight = 1.0;
    public const double MaxLineHeight = 3.0;
    public const double MinLetterSpacingEm = -0.05;
    public const double MaxLetterSpacingEm = 0.2;

    public static ReadingPresentationSnapshot Normalize(ReadingPresentationSnapshot? snapshot)
    {
        var source = snapshot ?? ReadingPresentationSnapshot.Default;

        return new ReadingPresentationSnapshot(
            NormalizeFontFamily(source.FontFamily),
            Clamp(source.FontSizePx, MinFontSizePx, MaxFontSizePx, ReadingPresentationSnapshot.Default.FontSizePx),
            Clamp(source.LineWidthPx, MinLineWidthPx, MaxLineWidthPx, ReadingPresentationSnapshot.Default.LineWidthPx),
            Clamp(source.LineHeight, MinLineHeight, MaxLineHeight, ReadingPresentationSnapshot.Default.LineHeight),
            Clamp(source.LetterSpacingEm, MinLetterSpacingEm, MaxLetterSpacingEm, ReadingPresentationSnapshot.Default.LetterSpacingEm),
            source.EditableByResearcher);
    }

    public static string NormalizeFontFamily(string? fontFamily)
    {
        return string.IsNullOrWhiteSpace(fontFamily)
            ? ReadingPresentationSnapshot.Default.FontFamily
            : fontFamily.Trim();
    }

    private static int Clamp(int value, int min, int max, int fallback)
    {
        if (value == 0)
        {
            value = fallback;
        }

        return Math.Min(max, Math.Max(min, value));
    }

    private static double Clamp(double value, double min, double max, double fallback)
    {
        if (Math.Abs(value) < double.Epsilon)
        {
            value = fallback;
        }

        return Math.Min(max, Math.Max(min, value));
    }
}
