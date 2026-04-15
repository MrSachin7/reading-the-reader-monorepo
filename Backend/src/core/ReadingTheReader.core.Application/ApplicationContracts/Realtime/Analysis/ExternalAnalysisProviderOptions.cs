namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Analysis;

public sealed class ExternalAnalysisProviderOptions
{
    public const string SectionName = "ExternalAnalysisProvider";

    public string SharedSecret { get; set; } = "change-me-local-analysis-provider-secret";

    public int HeartbeatTimeoutMilliseconds { get; set; } = 15_000;
}
