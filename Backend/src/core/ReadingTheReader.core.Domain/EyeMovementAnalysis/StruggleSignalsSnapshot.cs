namespace ReadingTheReader.core.Domain.EyeMovementAnalysis;

public sealed record StruggleSignalsSnapshot(
    string? ReadingStyle,
    string? CognitiveLoad,
    string? Ripa2Load,
    double? Ripa2Score = null,
    long ObservedAtUnixMs = 0)
{
    public StruggleSignalsSnapshot Copy()
    {
        return this with { };
    }
}
