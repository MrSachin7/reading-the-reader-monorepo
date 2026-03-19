using FastEndpoints;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
using ReadingTheReader.WebApi.Contracts.ExperimentSession;

namespace ReadingTheReader.WebApi.ExperimentSessionEndpoints;

public sealed class UpsertReadingSessionEndpoint : Endpoint<UpsertReadingSessionRequest, ExperimentSessionSnapshot>
{
    private readonly IExperimentSessionManager _experimentSessionManager;

    public UpsertReadingSessionEndpoint(IExperimentSessionManager experimentSessionManager)
    {
        _experimentSessionManager = experimentSessionManager;
    }

    public override void Configure()
    {
        Put("/experiment-session/reading-session");
        AllowAnonymous();
    }

    public override async Task HandleAsync(UpsertReadingSessionRequest req, CancellationToken ct)
    {
        try
        {
            await _experimentSessionManager.SetReadingSessionAsync(new UpsertReadingSessionCommand(
                req.DocumentId,
                req.Title,
                req.Markdown,
                req.SourceSetupId,
                new ReadingPresentationSnapshot(
                    req.FontFamily,
                    req.FontSizePx,
                    req.LineWidthPx,
                    req.LineHeight,
                    req.LetterSpacingEm,
                    req.EditableByResearcher)), ct);

            await Send.OkAsync(_experimentSessionManager.GetCurrentSnapshot(), ct);
        }
        catch (InvalidOperationException ex)
        {
            HttpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            await HttpContext.Response.WriteAsJsonAsync(new { message = ex.Message }, ct);
        }
    }
}
