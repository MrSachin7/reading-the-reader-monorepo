namespace ReadingTheReader.core.Application.InfrastructureContracts;

public interface IExternalProviderTransportAdapter
{
    ValueTask SendToProviderAsync<TPayload>(
        string connectionId,
        string messageType,
        TPayload payload,
        string? providerId = null,
        string? sessionId = null,
        string? correlationId = null,
        CancellationToken ct = default);
}
