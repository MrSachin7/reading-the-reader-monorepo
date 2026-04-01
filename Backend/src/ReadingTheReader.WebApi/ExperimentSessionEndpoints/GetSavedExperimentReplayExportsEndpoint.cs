using FastEndpoints;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Replay;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;

namespace ReadingTheReader.WebApi.ExperimentSessionEndpoints;

public sealed class GetSavedExperimentReplayExportsEndpoint : EndpointWithoutRequest<IReadOnlyCollection<SavedExperimentReplayExportSummary>>
{
    private readonly IExperimentSessionQueryService _experimentSessionQueryService;

    public GetSavedExperimentReplayExportsEndpoint(IExperimentSessionQueryService experimentSessionQueryService)
    {
        _experimentSessionQueryService = experimentSessionQueryService;
    }

    public override void Configure()
    {
        Get("/experiment-replay-exports");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var items = await _experimentSessionQueryService.ListSavedReplayExportsAsync(ct);
        await Send.OkAsync(items, ct);
    }
}
