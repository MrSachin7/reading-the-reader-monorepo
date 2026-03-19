using FastEndpoints;
using ReadingTheReader.core.Application.ApplicationContracts.Participants;
using ReadingTheReader.WebApi.Contracts.Participants;

namespace ReadingTheReader.WebApi.ParticipantEndpoints;

public class SetCurrentParticipant : Endpoint<SaveParticipantRequest>
{
    private readonly IParticipantService _participantService;

    public SetCurrentParticipant(IParticipantService participantService)
    {
        _participantService = participantService;
    }

    public override void Configure()
    {
        Post("/participant");
        AllowAnonymous();
    }

    public override async Task HandleAsync(SaveParticipantRequest req, CancellationToken ct)
    {
        var command = new SaveParticipantCommand
        {
            Name = req.Name,
            Age = req.Age,
            Sex = req.Sex,
            ExistingEyeCondition = req.ExistingEyeCondition,
            ReadingProficiency = req.ReadingProficiency
        };

        await _participantService.SetCurrentParticipantAsync(command, ct);
        await Send.OkAsync(cancellation: ct);
    }
}
