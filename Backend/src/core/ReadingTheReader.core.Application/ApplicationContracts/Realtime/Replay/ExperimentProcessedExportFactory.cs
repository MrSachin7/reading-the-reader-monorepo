using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;

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
            readingFocusEvents,
            [],
            [],
            [],
            [],
            []);

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
            enrichedGazeSamples is { Count: > 0 }
                ? BuildProcessedGazeSamples(enrichedGazeSamples)
                : BuildProcessedGazeSamples(gazeSamples, readingFocusEvents));
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
                item.Focus.Copy()))
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

        for (var gazeIndex = 0; gazeIndex < orderedGazeSamples.Length; gazeIndex++)
        {
            var gazeSample = orderedGazeSamples[gazeIndex];
            while (focusIndex < orderedFocusEvents.Length &&
                   orderedFocusEvents[focusIndex].Focus.UpdatedAtUnixMs <= gazeSample.CapturedAtUnixMs)
            {
                currentFocus = orderedFocusEvents[focusIndex].Focus.Copy();
                focusIndex++;
            }

            processed[gazeIndex] = new ProcessedGazeSampleRecord(
                gazeIndex + 1L,
                gazeSample.CapturedAtUnixMs,
                gazeSample.DeviceTimeStampUs,
                gazeSample.SystemTimeStampUs,
                gazeSample.Left?.Copy(),
                gazeSample.Right?.Copy(),
                currentFocus?.Copy());
        }

        return processed;
    }
}
