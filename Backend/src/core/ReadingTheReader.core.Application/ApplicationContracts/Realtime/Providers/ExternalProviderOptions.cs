namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Providers;

public sealed class ExternalProviderOptions
{
    public const string SectionName = "ExternalProvider";

    public string SharedSecret { get; set; } = "change-me-local-provider-secret";

    public int HeartbeatTimeoutMilliseconds { get; set; } = 15_000;
}
