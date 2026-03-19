namespace ReadingTheReader.core.Domain;

public class Participant {
    public required string Name { get; set; }
    public int Age { get; set; }
    public required string Sex { get; set; }
    public required string ExistingEyeCondition { get; set; }
    public required string ReadingProficiency { get; set; }

    public Participant Copy()
    {
        return new Participant
        {
            Name = Name,
            Age = Age,
            Sex = Sex,
            ExistingEyeCondition = ExistingEyeCondition,
            ReadingProficiency = ReadingProficiency
        };
    }
}
