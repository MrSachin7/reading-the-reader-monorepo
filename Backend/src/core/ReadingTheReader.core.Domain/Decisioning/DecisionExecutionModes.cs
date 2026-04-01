namespace ReadingTheReader.core.Domain.Decisioning;

public static class DecisionExecutionModes
{
    public const string Advisory = "advisory";
    public const string Autonomous = "autonomous";

    public static IReadOnlyList<string> All { get; } = [Advisory, Autonomous];
}
