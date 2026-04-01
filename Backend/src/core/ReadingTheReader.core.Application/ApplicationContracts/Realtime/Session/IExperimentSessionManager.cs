using ReadingTheReader.core.Domain;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime;

public interface IExperimentSessionManager
{
    ValueTask SetCurrentParticipantAsync(Participant participant, CancellationToken ct = default);
}
