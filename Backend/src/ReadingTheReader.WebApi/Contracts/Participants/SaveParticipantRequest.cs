namespace ReadingTheReader.WebApi.Contracts.Participants;

public sealed class SaveParticipantRequest
{
    public required string Name { get; set; }
    public int Age { get; set; }
    public required string Sex { get; set; }
    public required string ExistingEyeCondition { get; set; }
    public required string ReadingProficiency { get; set; }
}
