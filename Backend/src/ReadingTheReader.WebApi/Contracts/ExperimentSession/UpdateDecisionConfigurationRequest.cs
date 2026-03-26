namespace ReadingTheReader.WebApi.Contracts.ExperimentSession;

public sealed class UpdateDecisionConfigurationRequest
{
    public string ConditionLabel { get; set; } = string.Empty;

    public string ProviderId { get; set; } = string.Empty;

    public string ExecutionMode { get; set; } = string.Empty;

    public bool AutomationPaused { get; set; }
}
