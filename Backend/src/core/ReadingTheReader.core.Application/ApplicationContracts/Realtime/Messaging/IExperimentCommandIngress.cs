namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Messaging;

public interface IExperimentCommandIngress
{
    Task HandleAsync(IRealtimeIngressCommand command, CancellationToken ct = default);
}
