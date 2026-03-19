namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime;

public sealed class ReadingInterventionRuntime : IReadingInterventionRuntime
{
    public InterventionExecutionResult? Apply(
        ReadingPresentationSnapshot currentPresentation,
        ReaderAppearanceSnapshot currentAppearance,
        ApplyInterventionCommand command,
        long appliedAtUnixMs)
    {
        var safeCurrentPresentation = ReadingPresentationRules.Normalize(currentPresentation);
        var safeCurrentAppearance = ReaderAppearanceRules.Normalize(currentAppearance);
        var safeCommand = command ?? throw new ArgumentNullException(nameof(command));

        var nextPresentation = ReadingPresentationRules.Normalize(new ReadingPresentationSnapshot(
            safeCommand.Presentation.FontFamily ?? safeCurrentPresentation.FontFamily,
            safeCommand.Presentation.FontSizePx ?? safeCurrentPresentation.FontSizePx,
            safeCommand.Presentation.LineWidthPx ?? safeCurrentPresentation.LineWidthPx,
            safeCommand.Presentation.LineHeight ?? safeCurrentPresentation.LineHeight,
            safeCommand.Presentation.LetterSpacingEm ?? safeCurrentPresentation.LetterSpacingEm,
            safeCommand.Presentation.EditableByResearcher ?? safeCurrentPresentation.EditableByResearcher));

        var nextAppearance = ReaderAppearanceRules.Normalize(new ReaderAppearanceSnapshot(
            safeCommand.Appearance.ThemeMode ?? safeCurrentAppearance.ThemeMode,
            safeCommand.Appearance.Palette ?? safeCurrentAppearance.Palette,
            safeCommand.Appearance.AppFont ?? safeCurrentAppearance.AppFont));

        if (nextPresentation == safeCurrentPresentation && nextAppearance == safeCurrentAppearance)
        {
            return null;
        }

        var interventionEvent = new InterventionEventSnapshot(
            Guid.NewGuid(),
            NormalizeText(safeCommand.Source, "manual"),
            NormalizeText(safeCommand.Trigger, "researcher-ui"),
            NormalizeText(safeCommand.Reason, "Manual presentation update"),
            appliedAtUnixMs,
            nextPresentation.Copy(),
            nextAppearance.Copy());

        return new InterventionExecutionResult(nextPresentation, nextAppearance, interventionEvent);
    }

    private static string NormalizeText(string? value, string fallback)
    {
        return string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();
    }
}
