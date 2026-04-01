using FastEndpoints;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Reading;

namespace ReadingTheReader.WebApi.ReaderShellSettingsEndpoints;

public sealed class GetReaderShellSettingsEndpoint : EndpointWithoutRequest<ReaderShellSettingsSnapshot>
{
    private readonly IReaderShellSettingsService _readerShellSettingsService;

    public GetReaderShellSettingsEndpoint(IReaderShellSettingsService readerShellSettingsService)
    {
        _readerShellSettingsService = readerShellSettingsService;
    }

    public override void Configure()
    {
        Get("/reader-shell/settings");
        AllowAnonymous();
    }

    public override Task HandleAsync(CancellationToken ct)
    {
        return Send.OkAsync(_readerShellSettingsService.GetSettings(), ct);
    }
}
