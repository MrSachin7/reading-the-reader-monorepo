using FastEndpoints;
using ReadingTheReader.core.Application.ApplicationContracts.ReadingMaterialSetups;

namespace ReadingTheReader.WebApi.ReadingMaterialSetupEndpoints;

public sealed class GetReadingMaterialSetupsEndpoint : EndpointWithoutRequest<IReadOnlyCollection<ReadingMaterialSetup>>
{
    private readonly IReadingMaterialSetupService _readingMaterialSetupService;

    public GetReadingMaterialSetupsEndpoint(IReadingMaterialSetupService readingMaterialSetupService)
    {
        _readingMaterialSetupService = readingMaterialSetupService;
    }

    public override void Configure()
    {
        Get("/reading-material-setups");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        try
        {
            var items = await _readingMaterialSetupService.ListAsync(ct);
            await Send.OkAsync(items, ct);
        }
        catch (IOException ex)
        {
            HttpContext.Response.StatusCode = StatusCodes.Status500InternalServerError;
            await HttpContext.Response.WriteAsJsonAsync(new { message = "Failed to load reading material setups.", detail = ex.Message }, ct);
        }
    }
}
