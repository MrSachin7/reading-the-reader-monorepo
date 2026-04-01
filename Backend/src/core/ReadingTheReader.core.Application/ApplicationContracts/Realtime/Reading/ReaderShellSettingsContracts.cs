namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime;

public sealed record ReaderShellViewSettings(
    bool PreserveContextOnIntervention,
    bool HighlightContext,
    bool DisplayGazePosition,
    bool HighlightTokensBeingLookedAt,
    bool ShowFixationHeatmap,
    bool ShowToolbar,
    bool ShowBackButton,
    bool ShowLixScores);

public sealed record ReaderShellSettingsSnapshot(
    ReaderShellViewSettings Reading,
    ReaderShellViewSettings ResearcherMirror,
    ReaderShellViewSettings Replay);

public static class ReaderShellSettingsSnapshots
{
    public static ReaderShellSettingsSnapshot CreateDefault()
    {
        return new ReaderShellSettingsSnapshot(
            new ReaderShellViewSettings(
                PreserveContextOnIntervention: true,
                HighlightContext: false,
                DisplayGazePosition: false,
                HighlightTokensBeingLookedAt: true,
                ShowFixationHeatmap: false,
                ShowToolbar: false,
                ShowBackButton: false,
                ShowLixScores: false),
            new ReaderShellViewSettings(
                PreserveContextOnIntervention: true,
                HighlightContext: true,
                DisplayGazePosition: false,
                HighlightTokensBeingLookedAt: false,
                ShowFixationHeatmap: false,
                ShowToolbar: false,
                ShowBackButton: false,
                ShowLixScores: false),
            new ReaderShellViewSettings(
                PreserveContextOnIntervention: true,
                HighlightContext: true,
                DisplayGazePosition: true,
                HighlightTokensBeingLookedAt: true,
                ShowFixationHeatmap: false,
                ShowToolbar: false,
                ShowBackButton: true,
                ShowLixScores: true));
    }
}
