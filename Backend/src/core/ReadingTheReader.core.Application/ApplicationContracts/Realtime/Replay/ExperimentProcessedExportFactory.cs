using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;
using ReadingTheReader.core.Domain.Reading;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Replay;

public static class ExperimentProcessedExportFactory
{
    public static ExperimentProcessedExport Create(
        ExperimentSessionSnapshot initialSnapshot,
        ExperimentSessionSnapshot latestSnapshot,
        string completionSource,
        long exportedAtUnixMs,
        IReadOnlyList<ExperimentLifecycleEventRecord> lifecycleEvents,
        IReadOnlyList<RawGazeSampleRecord> gazeSamples,
        IReadOnlyList<ReadingFocusEventRecord> readingFocusEvents,
        IReadOnlyList<EnrichedGazeSampleRecord>? enrichedGazeSamples = null)
    {
        var replayExport = ExperimentReplayExportFactory.Create(
            initialSnapshot,
            latestSnapshot,
            completionSource,
            exportedAtUnixMs,
            lifecycleEvents,
            gazeSamples,
            [],
            [],
            readingFocusEvents,
            [],
            [],
            [],
            [],
            []);

        var processedSamples = enrichedGazeSamples is { Count: > 0 }
            ? BuildProcessedGazeSamples(enrichedGazeSamples)
            : BuildProcessedGazeSamples(gazeSamples, readingFocusEvents);

        return new ExperimentProcessedExport(
            replayExport.Manifest with
            {
                Schema = ExperimentProcessedExportSchema.Name,
                Version = ExperimentProcessedExportSchema.Version,
                ExportProfile = "processed",
                Producer = replayExport.Manifest.Producer with
                {
                    ExporterVersion = ExperimentProcessedExportSchema.Version.ToString()
                }
            },
            replayExport.Experiment.Copy(),
            replayExport.Content.Copy(),
            processedSamples,
            BuildMaterialSummaries(replayExport.Experiment.Run, processedSamples, readingFocusEvents));
    }

    private static IReadOnlyList<ProcessedGazeSampleRecord> BuildProcessedGazeSamples(
        IReadOnlyList<EnrichedGazeSampleRecord> enrichedGazeSamples)
    {
        return enrichedGazeSamples
            .Select(item => item.Copy())
            .OrderBy(item => item.CapturedAtUnixMs)
            .ThenBy(item => item.SequenceNumber)
            .Select((item, index) => new ProcessedGazeSampleRecord(
                index + 1L,
                item.CapturedAtUnixMs,
                item.DeviceTimeStampUs,
                item.SystemTimeStampUs,
                item.Left?.Copy(),
                item.Right?.Copy(),
                item.Focus.Copy(),
                item.MaterialRunId,
                item.MaterialIndex))
            .ToArray();
    }

    private static IReadOnlyList<ProcessedGazeSampleRecord> BuildProcessedGazeSamples(
        IReadOnlyList<RawGazeSampleRecord> gazeSamples,
        IReadOnlyList<ReadingFocusEventRecord> readingFocusEvents)
    {
        var orderedGazeSamples = gazeSamples
            .Select(item => item.Copy())
            .OrderBy(item => item.CapturedAtUnixMs)
            .ThenBy(item => item.SequenceNumber)
            .ToArray();
        var orderedFocusEvents = readingFocusEvents
            .Select(item => item.Copy())
            .OrderBy(item => item.Focus.UpdatedAtUnixMs)
            .ThenBy(item => item.SequenceNumber)
            .ToArray();

        var processed = new ProcessedGazeSampleRecord[orderedGazeSamples.Length];
        var focusIndex = 0;
        ReadingFocusSnapshot? currentFocus = null;
        ReadingFocusEventRecord? currentFocusEvent = null;

        for (var gazeIndex = 0; gazeIndex < orderedGazeSamples.Length; gazeIndex++)
        {
            var gazeSample = orderedGazeSamples[gazeIndex];
            while (focusIndex < orderedFocusEvents.Length &&
                   orderedFocusEvents[focusIndex].Focus.UpdatedAtUnixMs <= gazeSample.CapturedAtUnixMs)
            {
                currentFocusEvent = orderedFocusEvents[focusIndex].Copy();
                currentFocus = currentFocusEvent.Focus.Copy();
                focusIndex++;
            }

            processed[gazeIndex] = new ProcessedGazeSampleRecord(
                gazeIndex + 1L,
                gazeSample.CapturedAtUnixMs,
                gazeSample.DeviceTimeStampUs,
                gazeSample.SystemTimeStampUs,
                gazeSample.Left?.Copy(),
                gazeSample.Right?.Copy(),
                currentFocus?.Copy(),
                currentFocusEvent?.MaterialRunId,
                currentFocusEvent?.MaterialIndex);
        }

        return processed;
    }

    private static IReadOnlyList<ProcessedMaterialSummary> BuildMaterialSummaries(
        ExperimentRunSnapshot? run,
        IReadOnlyList<ProcessedGazeSampleRecord> gazeSamples,
        IReadOnlyList<ReadingFocusEventRecord> readingFocusEvents)
    {
        if (run?.Materials is null || run.Materials.Count == 0)
        {
            return [];
        }

        return run.Materials
            .OrderBy(item => item.Order)
            .Select(material =>
            {
                var gaze = gazeSamples
                    .Where(item => string.Equals(item.MaterialRunId, material.Id, StringComparison.Ordinal))
                    .ToArray();
                var focus = readingFocusEvents
                    .Where(item => string.Equals(item.MaterialRunId, material.Id, StringComparison.Ordinal))
                    .ToArray();
                var observations = gaze.Select(item => (long?)item.CapturedAtUnixMs)
                    .Concat(focus.Select(item => (long?)item.OccurredAtUnixMs))
                    .Where(item => item.HasValue)
                    .ToArray();
                var firstObserved = observations.Length == 0 ? null : observations.Min();
                var lastObserved = observations.Length == 0 ? null : observations.Max();

                return new ProcessedMaterialSummary(
                    material.Id,
                    material.Order,
                    material.Title,
                    material.SourceSetupId,
                    gaze.Length,
                    focus.Length,
                    firstObserved,
                    lastObserved);
            })
            .ToArray();
    }
}
