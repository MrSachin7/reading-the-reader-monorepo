namespace ReadingTheReader.WebApi.Contracts.ExperimentSession;

public sealed class UpdateInterventionPolicyRequest
{
    public string LayoutCommitBoundary { get; set; } = string.Empty;

    public string LayoutFallbackBoundary { get; set; } = string.Empty;

    public long LayoutFallbackAfterMs { get; set; }
}
