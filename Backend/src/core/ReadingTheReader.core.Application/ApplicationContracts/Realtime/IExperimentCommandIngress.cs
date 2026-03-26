namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime;

public interface IExperimentCommandIngress
{
    Task HandleAsync(IRealtimeIngressCommand command, CancellationToken ct = default);
}
