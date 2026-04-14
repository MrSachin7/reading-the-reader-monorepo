namespace ReadingTheReader.core.Domain.EyeMovementAnalysis;

public static class EyeMovementAnalysisProviderIds
{
    public const string BuiltIn = "builtin";
    public const string External = "external";

    public static IReadOnlyList<string> All { get; } = [BuiltIn, External];
}
