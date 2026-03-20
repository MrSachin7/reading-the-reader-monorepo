using FastEndpoints;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;

namespace ReadingTheReader.WebApi.ReaderShellSettingsEndpoints;

public sealed class UpdateReaderShellSettingsEndpoint
    : Endpoint<UpdateReaderShellSettingsRequest, ReaderShellSettingsSnapshot>
{
    private readonly IReaderShellSettingsService _readerShellSettingsService;

    public UpdateReaderShellSettingsEndpoint(IReaderShellSettingsService readerShellSettingsService)
    {
        _readerShellSettingsService = readerShellSettingsService;
    }

    public override void Configure()
    {
        Put("/reader-shell/settings");
        AllowAnonymous();
    }

    public override async Task HandleAsync(UpdateReaderShellSettingsRequest req, CancellationToken ct)
    {
        if (req.Reading is null || req.ResearcherMirror is null || req.Replay is null)
        {
            HttpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            await HttpContext.Response.WriteAsJsonAsync(
                new { message = "reading, researcherMirror, and replay settings are required." },
                ct);
            return;
        }

        var nextSettings = new ReaderShellSettingsSnapshot(
            MapView(req.Reading),
            MapView(req.ResearcherMirror),
            MapView(req.Replay));

        await Send.OkAsync(await _readerShellSettingsService.UpdateSettingsAsync(nextSettings, ct), ct);
    }

    private static ReaderShellViewSettings MapView(UpdateReaderShellViewSettingsRequest req)
    {
        return new ReaderShellViewSettings(
            req.PreserveContextOnIntervention,
            req.HighlightContext,
            req.DisplayGazePosition,
            req.HighlightTokensBeingLookedAt,
            req.ShowFixationHeatmap,
            req.ShowToolbar,
            req.ShowBackButton,
            req.ShowLixScores);
    }
}

public sealed class UpdateReaderShellSettingsRequest
{
    public UpdateReaderShellViewSettingsRequest? Reading { get; set; }

    public UpdateReaderShellViewSettingsRequest? ResearcherMirror { get; set; }

    public UpdateReaderShellViewSettingsRequest? Replay { get; set; }
}

public sealed class UpdateReaderShellViewSettingsRequest
{
    public bool PreserveContextOnIntervention { get; set; }

    public bool HighlightContext { get; set; }

    public bool DisplayGazePosition { get; set; }

    public bool HighlightTokensBeingLookedAt { get; set; }

    public bool ShowFixationHeatmap { get; set; }

    public bool ShowToolbar { get; set; }

    public bool ShowBackButton { get; set; }

    public bool ShowLixScores { get; set; }
}
