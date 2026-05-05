using ReadingTheReader.core.Domain.Reading;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Replay;

public static class ExperimentProcessedExportSchema
{
    public const string Name = "rtr.processed-experiment-export";
    public const int Version = 2;
}

public sealed record ProcessedGazeSampleRecord(
    long SequenceNumber,
    long CapturedAtUnixMs,
    long DeviceTimeStampUs,
    long? SystemTimeStampUs,
    ReplayEyeSample? Left,
    ReplayEyeSample? Right,
    ReadingFocusSnapshot? Focus,
    string? MaterialRunId = null,
    int? MaterialIndex = null)
{
    public ProcessedGazeSampleRecord Copy()
    {
        return new ProcessedGazeSampleRecord(
            SequenceNumber,
            CapturedAtUnixMs,
            DeviceTimeStampUs,
            SystemTimeStampUs,
            Left?.Copy(),
            Right?.Copy(),
            Focus?.Copy(),
            MaterialRunId,
            MaterialIndex);
    }
}

public sealed record EnrichedGazeSampleRecord(
    long SequenceNumber,
    long CapturedAtUnixMs,
    long DeviceTimeStampUs,
    long? SystemTimeStampUs,
    ReplayEyeSample? Left,
    ReplayEyeSample? Right,
    ReadingFocusSnapshot Focus,
    string? MaterialRunId = null,
    int? MaterialIndex = null)
{
    public EnrichedGazeSampleRecord Copy()
    {
        return new EnrichedGazeSampleRecord(
            SequenceNumber,
            CapturedAtUnixMs,
            DeviceTimeStampUs,
            SystemTimeStampUs,
            Left?.Copy(),
            Right?.Copy(),
            Focus.Copy(),
            MaterialRunId,
            MaterialIndex);
    }
}

public sealed record ProcessedMaterialSummary(
    string MaterialRunId,
    int Order,
    string Title,
    string? SourceSetupId,
    long GazeSampleCount,
    long FocusEventCount,
    long? FirstObservedAtUnixMs,
    long? LastObservedAtUnixMs)
{
    public ProcessedMaterialSummary Copy()
    {
        return this with { };
    }
}

public sealed record ExperimentProcessedExport(
    ExperimentReplayExportManifest Manifest,
    ExperimentReplayContext Experiment,
    ExperimentReplayContent Content,
    IReadOnlyList<ProcessedGazeSampleRecord> GazeSamples,
    IReadOnlyList<ProcessedMaterialSummary> MaterialSummaries)
{
    public ExperimentProcessedExport Copy()
    {
        return new ExperimentProcessedExport(
            Manifest.Copy(),
            Experiment.Copy(),
            Content.Copy(),
            GazeSamples is null ? [] : [.. GazeSamples.Select(item => item.Copy())],
            MaterialSummaries is null ? [] : [.. MaterialSummaries.Select(item => item.Copy())]);
    }
}
