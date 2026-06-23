using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Replay;

public static class ExperimentTelemetryExportFactory
{
    private const double RttBudgetMs = 100d;

    public static ExperimentTelemetryExport Create(
        ExperimentSessionSnapshot initialSnapshot,
        ExperimentSessionSnapshot latestSnapshot,
        string completionSource,
        long exportedAtUnixMs,
        IReadOnlyList<ExperimentTelemetrySampleRecord> samples)
    {
        var orderedSamples = (samples ?? [])
            .Select(item => item.Copy())
            .OrderBy(item => item.SequenceNumber)
            .ToArray();

        var startedAtUnixMs = latestSnapshot.StartedAtUnixMs > 0
            ? latestSnapshot.StartedAtUnixMs
            : initialSnapshot.StartedAtUnixMs;
        var endedAtUnixMs = latestSnapshot.StoppedAtUnixMs;
        long? durationMs = startedAtUnixMs > 0 && endedAtUnixMs.HasValue
            ? Math.Max(0L, endedAtUnixMs.Value - startedAtUnixMs)
            : null;

        var manifest = new ExperimentTelemetryExportManifest(
            ExperimentTelemetryExportSchema.Name,
            ExperimentTelemetryExportSchema.Version,
            exportedAtUnixMs,
            string.IsNullOrWhiteSpace(completionSource) ? "unknown" : completionSource.Trim(),
            new ExperimentTelemetryExportProducer(
                "reading-the-reader",
                ExperimentTelemetryExportSchema.Version.ToString()));

        // The budgeted RTT summary keeps its original meaning (client browser->server
        // ping). Latency roles (pipeline-decision, decision-provider-rtt) also carry a
        // value in RttMs but are summarised separately by the analysis notebooks, so
        // they are excluded here to avoid blending distinct latencies into one figure.
        var summary = new ExperimentTelemetrySummary(
            SummarizeWithBudget(
                orderedSamples.Where(item => IsClientRole(item.Role)).Select(item => item.RttMs),
                RttBudgetMs),
            Summarize(orderedSamples.Select(item => item.SampleRateHz)),
            Summarize(orderedSamples.Select(item => item.ValidityRate)));

        return new ExperimentTelemetryExport(
            manifest,
            latestSnapshot.SessionId ?? initialSnapshot.SessionId,
            startedAtUnixMs,
            endedAtUnixMs,
            durationMs,
            latestSnapshot.SignalSources?.Copy() ?? initialSnapshot.SignalSources?.Copy(),
            orderedSamples,
            summary);
    }

    private static bool IsClientRole(string? role)
    {
        return string.Equals(role, ExperimentTelemetryRoles.Participant, StringComparison.Ordinal)
            || string.Equals(role, ExperimentTelemetryRoles.Researcher, StringComparison.Ordinal);
    }

    private static ExperimentTelemetryMetricSummary Summarize(IEnumerable<double?> values)
    {
        var sorted = values.Where(value => value.HasValue).Select(value => value!.Value).OrderBy(value => value).ToArray();
        if (sorted.Length == 0)
        {
            return new ExperimentTelemetryMetricSummary(0, null, null, null, null);
        }

        return new ExperimentTelemetryMetricSummary(
            sorted.Length,
            sorted[0],
            Percentile(sorted, 0.5),
            Percentile(sorted, 0.95),
            sorted[^1]);
    }

    private static ExperimentTelemetryMetricSummary SummarizeWithBudget(IEnumerable<double?> values, double budgetMs)
    {
        var sorted = values.Where(value => value.HasValue).Select(value => value!.Value).OrderBy(value => value).ToArray();
        if (sorted.Length == 0)
        {
            return new ExperimentTelemetryMetricSummary(0, null, null, null, null, null, budgetMs);
        }

        var overBudgetCount = sorted.Count(value => value > budgetMs);
        var overBudgetPct = Math.Round(100d * overBudgetCount / sorted.Length, 2);

        return new ExperimentTelemetryMetricSummary(
            sorted.Length,
            sorted[0],
            Percentile(sorted, 0.5),
            Percentile(sorted, 0.95),
            sorted[^1],
            overBudgetPct,
            budgetMs);
    }

    private static double Percentile(double[] sorted, double quantile)
    {
        if (sorted.Length == 1)
        {
            return sorted[0];
        }

        var rank = quantile * (sorted.Length - 1);
        var lowerIndex = (int)Math.Floor(rank);
        var upperIndex = (int)Math.Ceiling(rank);
        if (lowerIndex == upperIndex)
        {
            return sorted[lowerIndex];
        }

        var weight = rank - lowerIndex;
        return sorted[lowerIndex] + weight * (sorted[upperIndex] - sorted[lowerIndex]);
    }
}
