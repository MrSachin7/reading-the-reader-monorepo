namespace ReadingTheReader.core.Application.ApplicationContracts.Participants;

public sealed class SaveParticipantCommand
{
    public required string Name { get; set; }
    public int Age { get; set; }
    public required string Sex { get; set; }
    public required string ExistingEyeCondition { get; set; }
    public required string ReadingProficiency { get; set; }
}
