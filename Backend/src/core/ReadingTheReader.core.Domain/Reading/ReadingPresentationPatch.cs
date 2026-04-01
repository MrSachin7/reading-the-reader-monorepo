namespace ReadingTheReader.core.Domain.Reading;

public sealed record ReadingPresentationPatch(
    string? FontFamily,
    int? FontSizePx,
    int? LineWidthPx,
    double? LineHeight,
    double? LetterSpacingEm,
    bool? EditableByResearcher);
