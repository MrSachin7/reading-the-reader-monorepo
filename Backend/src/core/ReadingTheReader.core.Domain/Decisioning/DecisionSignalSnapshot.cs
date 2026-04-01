namespace ReadingTheReader.core.Domain.Decisioning;

public sealed record DecisionSignalSnapshot(
    string SignalType,
    string Summary,
    long ObservedAtUnixMs,
    double? Confidence = null)
{
    public DecisionSignalSnapshot Copy()
    {
        return this with { };
    }
}
