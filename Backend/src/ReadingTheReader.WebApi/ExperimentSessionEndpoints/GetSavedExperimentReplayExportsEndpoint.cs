using FastEndpoints;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;

namespace ReadingTheReader.WebApi.ExperimentSessionEndpoints;

public sealed class GetSavedExperimentReplayExportsEndpoint : EndpointWithoutRequest<IReadOnlyCollection<SavedExperimentReplayExportSummary>>
{
    private readonly IExperimentSessionManager _experimentSessionManager;

    public GetSavedExperimentReplayExportsEndpoint(IExperimentSessionManager experimentSessionManager)
    {
        _experimentSessionManager = experimentSessionManager;
    }

    public override void Configure()
    {
        Get("/experiment-replay-exports");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var items = await _experimentSessionManager.ListSavedReplayExportsAsync(ct);
        await Send.OkAsync(items, ct);
    }
}
