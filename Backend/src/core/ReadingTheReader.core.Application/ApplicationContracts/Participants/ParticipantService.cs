using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
using DomainParticipant = ReadingTheReader.core.Domain.Participant;

namespace ReadingTheReader.core.Application.ApplicationContracts.Participants;

public sealed class ParticipantService : IParticipantService
{
    private readonly IExperimentSessionManager _experimentSessionManager;

    public ParticipantService(IExperimentSessionManager experimentSessionManager)
    {
        _experimentSessionManager = experimentSessionManager;
    }

    public async ValueTask SetCurrentParticipantAsync(SaveParticipantCommand command, CancellationToken ct = default)
    {
        var participant = new DomainParticipant
        {
            Name = command.Name,
            Age = command.Age,
            Sex = command.Sex,
            ExistingEyeCondition = command.ExistingEyeCondition,
            ReadingProficiency = command.ReadingProficiency
        };

        await _experimentSessionManager.SetCurrentParticipantAsync(participant, ct);
    }
}
