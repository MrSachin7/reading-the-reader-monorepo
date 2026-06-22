using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Sensing;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Replay;

public static class ExperimentTelemetryExportSchema
{
    public const string Name = "rtr.experiment-telemetry";
    public const int Version = 1;
}

public static class ExperimentTelemetryRoles
{
    public const string Participant = "participant";
    public const string Researcher = "researcher";
    public const string Unknown = "unknown";

    public static string Normalize(string? role)
    {
        return role?.Trim().ToLowerInvariant() switch
        {
            Participant => Participant,
            Researcher => Researcher,
            _ => Unknown
        };
    }
}

public sealed record ExperimentTelemetryExportProducer(
    string AppName,
    string ExporterVersion)
{
    public ExperimentTelemetryExportProducer Copy()
    {
        return this with { };
    }
}

public sealed record ExperimentTelemetryExportManifest(
    string Schema,
    int Version,
    long ExportedAtUnixMs,
    string CompletionSource,
    ExperimentTelemetryExportProducer Producer)
{
    public ExperimentTelemetryExportManifest Copy()
    {
        return new ExperimentTelemetryExportManifest(
            Schema,
            Version,
            ExportedAtUnixMs,
            CompletionSource,
            Producer.Copy());
    }
}

public sealed record ExperimentTelemetrySampleRecord(
    long SequenceNumber,
    long OccurredAtUnixMs,
    string Role,
    double? RttMs,
    double? SampleRateHz,
    double? ValidityRate)
{
    public ExperimentTelemetrySampleRecord Copy()
    {
        return this with { };
    }
}

public sealed record ExperimentTelemetryMetricSummary(
    long Count,
    double? Min,
    double? Median,
    double? P95,
    double? Max,
    double? OverBudgetPct = null,
    double? BudgetMs = null)
{
    public ExperimentTelemetryMetricSummary Copy()
    {
        return this with { };
    }
}

public sealed record ExperimentTelemetrySummary(
    ExperimentTelemetryMetricSummary RttMs,
    ExperimentTelemetryMetricSummary SampleRateHz,
    ExperimentTelemetryMetricSummary ValidityRate)
{
    public ExperimentTelemetrySummary Copy()
    {
        return new ExperimentTelemetrySummary(
            RttMs.Copy(),
            SampleRateHz.Copy(),
            ValidityRate.Copy());
    }
}

public sealed record ExperimentTelemetryExport(
    ExperimentTelemetryExportManifest Manifest,
    Guid? SessionId,
    long StartedAtUnixMs,
    long? EndedAtUnixMs,
    long? DurationMs,
    SensingSignalSourcesSnapshot? SignalSources,
    IReadOnlyList<ExperimentTelemetrySampleRecord> Samples,
    ExperimentTelemetrySummary Summary)
{
    public ExperimentTelemetryExport Copy()
    {
        return new ExperimentTelemetryExport(
            Manifest.Copy(),
            SessionId,
            StartedAtUnixMs,
            EndedAtUnixMs,
            DurationMs,
            SignalSources?.Copy(),
            Samples is null ? [] : [.. Samples.Select(item => item.Copy())],
            Summary.Copy());
    }
}
