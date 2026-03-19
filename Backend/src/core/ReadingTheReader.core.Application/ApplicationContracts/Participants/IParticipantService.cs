namespace ReadingTheReader.core.Application.ApplicationContracts.Participants;

public interface IParticipantService
{
    ValueTask SetCurrentParticipantAsync(SaveParticipantCommand command, CancellationToken ct = default);
}
