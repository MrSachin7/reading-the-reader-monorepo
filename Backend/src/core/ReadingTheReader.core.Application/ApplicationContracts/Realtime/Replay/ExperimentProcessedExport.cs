using ReadingTheReader.core.Domain.Reading;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Replay;

public static class ExperimentProcessedExportSchema
{
    public const string Name = "rtr.processed-experiment-export";
    public const int Version = 1;
}

public sealed record ProcessedGazeSampleRecord(
    long SequenceNumber,
    long CapturedAtUnixMs,
    long DeviceTimeStampUs,
    long? SystemTimeStampUs,
    ReplayEyeSample? Left,
    ReplayEyeSample? Right,
    ReadingFocusSnapshot? Focus)
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
            Focus?.Copy());
    }
}

public sealed record EnrichedGazeSampleRecord(
    long SequenceNumber,
    long CapturedAtUnixMs,
    long DeviceTimeStampUs,
    long? SystemTimeStampUs,
    ReplayEyeSample? Left,
    ReplayEyeSample? Right,
    ReadingFocusSnapshot Focus)
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
            Focus.Copy());
    }
}

public sealed record ExperimentProcessedExport(
    ExperimentReplayExportManifest Manifest,
    ExperimentReplayContext Experiment,
    ExperimentReplayContent Content,
    IReadOnlyList<ProcessedGazeSampleRecord> GazeSamples)
{
    public ExperimentProcessedExport Copy()
    {
        return new ExperimentProcessedExport(
            Manifest.Copy(),
            Experiment.Copy(),
            Content.Copy(),
            GazeSamples is null ? [] : [.. GazeSamples.Select(item => item.Copy())]);
    }
}
