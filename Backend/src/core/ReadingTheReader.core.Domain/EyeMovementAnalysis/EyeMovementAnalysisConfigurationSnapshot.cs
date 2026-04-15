namespace ReadingTheReader.core.Domain.EyeMovementAnalysis;

public sealed record EyeMovementAnalysisConfigurationSnapshot(string ProviderId)
{
    public static EyeMovementAnalysisConfigurationSnapshot Default { get; } =
        new(EyeMovementAnalysisProviderIds.BuiltIn);

    public EyeMovementAnalysisConfigurationSnapshot Copy()
    {
        return this with { };
    }
}
