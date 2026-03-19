namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime;

public sealed class ReadingInterventionRuntime : IReadingInterventionRuntime
{
    public InterventionExecutionResult? Apply(
        ReadingPresentationSnapshot currentPresentation,
        ApplyInterventionCommand command,
        long appliedAtUnixMs)
    {
        var safeCurrentPresentation = ReadingPresentationRules.Normalize(currentPresentation);
        var safeCommand = command ?? throw new ArgumentNullException(nameof(command));

        var nextPresentation = ReadingPresentationRules.Normalize(new ReadingPresentationSnapshot(
            safeCommand.Presentation.FontFamily ?? safeCurrentPresentation.FontFamily,
            safeCommand.Presentation.FontSizePx ?? safeCurrentPresentation.FontSizePx,
            safeCommand.Presentation.LineWidthPx ?? safeCurrentPresentation.LineWidthPx,
            safeCommand.Presentation.LineHeight ?? safeCurrentPresentation.LineHeight,
            safeCommand.Presentation.LetterSpacingEm ?? safeCurrentPresentation.LetterSpacingEm,
            safeCommand.Presentation.EditableByResearcher ?? safeCurrentPresentation.EditableByResearcher));

        if (nextPresentation == safeCurrentPresentation)
        {
            return null;
        }

        var interventionEvent = new InterventionEventSnapshot(
            Guid.NewGuid(),
            NormalizeText(safeCommand.Source, "manual"),
            NormalizeText(safeCommand.Trigger, "researcher-ui"),
            NormalizeText(safeCommand.Reason, "Manual presentation update"),
            appliedAtUnixMs,
            nextPresentation.Copy());

        return new InterventionExecutionResult(nextPresentation, interventionEvent);
    }

    private static string NormalizeText(string? value, string fallback)
    {
        return string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();
    }
}
