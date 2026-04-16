using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Decisioning;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Reading;
using ReadingTheReader.core.Domain.Reading;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Replay;

public static class ExperimentReplayExportSchema
{
    public const string Name = "rtr.experiment-export";
    public const int Version = 4;
}

public sealed record ExperimentReplayExportManifest(
    string Schema,
    int Version,
    long ExportedAtUnixMs,
    string CompletionSource,
    string ExportProfile,
    ExperimentReplayExportProducer Producer,
    string? SavedName = null)
{
    public ExperimentReplayExportManifest Copy()
    {
        return new ExperimentReplayExportManifest(
            Schema,
            Version,
            ExportedAtUnixMs,
            CompletionSource,
            ExportProfile,
            Producer.Copy(),
            SavedName);
    }
}

public sealed record ExperimentReplayExportProducer(
    string AppName,
    string BackendSdk,
    string BackendSdkVersion,
    string ExporterVersion)
{
    public ExperimentReplayExportProducer Copy()
    {
        return this with { };
    }
}

public sealed record ExperimentReplayParticipant(
    string Name,
    int? Age,
    string? Sex,
    string? ExistingEyeCondition,
    string? ReadingProficiency)
{
    public ExperimentReplayParticipant Copy()
    {
        return this with { };
    }
}

public sealed record ExperimentReplayDevice(
    string? Name,
    string? Model,
    string? SerialNumber,
    bool? HasSavedLicence)
{
    public ExperimentReplayDevice Copy()
    {
        return this with { };
    }
}

public sealed record ExperimentReplayScreen(
    int ScreenWidthPx,
    int ScreenHeightPx,
    int AvailableScreenWidthPx,
    int AvailableScreenHeightPx,
    int PhysicalScreenWidthPx,
    int PhysicalScreenHeightPx,
    double DevicePixelRatio)
{
    public ExperimentReplayScreen Copy()
    {
        return this with { };
    }

    public static ExperimentReplayScreen FromSnapshot(ParticipantScreenSnapshot screen)
    {
        var safeScreen = screen.Copy();
        return new ExperimentReplayScreen(
            safeScreen.ScreenWidthPx,
            safeScreen.ScreenHeightPx,
            safeScreen.AvailableScreenWidthPx,
            safeScreen.AvailableScreenHeightPx,
            safeScreen.PhysicalScreenWidthPx,
            safeScreen.PhysicalScreenHeightPx,
            safeScreen.DevicePixelRatio);
    }
}

public sealed record ExperimentReplayCalibrationSummary(
    string? Pattern,
    bool Applied,
    bool ValidationPassed,
    string? Quality,
    double? AverageAccuracyDegrees,
    double? AveragePrecisionDegrees,
    int SampleCount)
{
    public ExperimentReplayCalibrationSummary Copy()
    {
        return this with { };
    }
}

public sealed record ExperimentReplayContext(
    Guid? SessionId,
    long StartedAtUnixMs,
    long? EndedAtUnixMs,
    long? DurationMs,
    DecisionConfigurationSnapshot Condition,
    ExperimentReplayParticipant? Participant,
    ExperimentReplayDevice? Device,
    ExperimentReplayScreen? Screen,
    ExperimentReplayCalibrationSummary Calibration,
    IReadOnlyList<ExperimentLifecycleEventRecord> LifecycleEvents)
{
    public ExperimentReplayContext Copy()
    {
        return new ExperimentReplayContext(
            SessionId,
            StartedAtUnixMs,
            EndedAtUnixMs,
            DurationMs,
            Condition.Copy(),
            Participant?.Copy(),
            Device?.Copy(),
            Screen?.Copy(),
            Calibration.Copy(),
            LifecycleEvents is null ? [] : [.. LifecycleEvents.Select(item => item.Copy())]);
    }
}

public sealed record ExperimentReplayContentTokenization(
    string Strategy,
    string Version)
{
    public ExperimentReplayContentTokenization Copy()
    {
        return this with { };
    }
}

public sealed record ExperimentReplayContent(
    string DocumentId,
    string Title,
    string Markdown,
    string? SourceSetupId,
    long UpdatedAtUnixMs,
    string ContentHash,
    ExperimentReplayContentTokenization Tokenization)
{
    public ExperimentReplayContent Copy()
    {
        return new ExperimentReplayContent(
            DocumentId,
            Title,
            Markdown,
            SourceSetupId,
            UpdatedAtUnixMs,
            ContentHash,
            Tokenization.Copy());
    }
}

public sealed record ReplayEyePoint2D(
    float? X,
    float? Y,
    string Validity)
{
    public ReplayEyePoint2D Copy()
    {
        return this with { };
    }
}

public sealed record ReplayEyePoint3D(
    float? X,
    float? Y,
    float? Z)
{
    public ReplayEyePoint3D Copy()
    {
        return this with { };
    }
}

public sealed record ReplayEyePupil(
    float? DiameterMm,
    string Validity)
{
    public ReplayEyePupil Copy()
    {
        return this with { };
    }
}

public sealed record ReplayEyeOrigin3D(
    float? X,
    float? Y,
    float? Z,
    string Validity)
{
    public ReplayEyeOrigin3D Copy()
    {
        return this with { };
    }
}

public sealed record ReplayEyeTrackBoxPoint(
    float? X,
    float? Y,
    float? Z)
{
    public ReplayEyeTrackBoxPoint Copy()
    {
        return this with { };
    }
}

public sealed record ReplayEyeSample(
    ReplayEyePoint2D GazePoint2D,
    ReplayEyePoint3D? GazePoint3D,
    ReplayEyePupil? Pupil,
    ReplayEyeOrigin3D? GazeOrigin3D,
    ReplayEyeTrackBoxPoint? GazeOriginTrackBox)
{
    public ReplayEyeSample Copy()
    {
        return new ReplayEyeSample(
            GazePoint2D.Copy(),
            GazePoint3D?.Copy(),
            Pupil?.Copy(),
            GazeOrigin3D?.Copy(),
            GazeOriginTrackBox?.Copy());
    }
}

public sealed record RawGazeSampleRecord(
    long SequenceNumber,
    long CapturedAtUnixMs,
    long? ElapsedSinceStartMs,
    long DeviceTimeStampUs,
    long? SystemTimeStampUs,
    ReplayEyeSample? Left,
    ReplayEyeSample? Right)
{
    public RawGazeSampleRecord Copy()
    {
        return new RawGazeSampleRecord(
            SequenceNumber,
            CapturedAtUnixMs,
            ElapsedSinceStartMs,
            DeviceTimeStampUs,
            SystemTimeStampUs,
            Left?.Copy(),
            Right?.Copy());
    }
}

public sealed record ReadingAttentionEventRecord(
    long SequenceNumber,
    long OccurredAtUnixMs,
    long? ElapsedSinceStartMs,
    ReadingAttentionSummarySnapshot Summary)
{
    public ReadingAttentionEventRecord Copy()
    {
        return new ReadingAttentionEventRecord(
            SequenceNumber,
            OccurredAtUnixMs,
            ElapsedSinceStartMs,
            Summary.Copy());
    }
}

public sealed record ReadingContextPreservationEventRecord(
    long SequenceNumber,
    long OccurredAtUnixMs,
    long? ElapsedSinceStartMs,
    ReadingContextPreservationEventSnapshot ContextPreservation)
{
    public ReadingContextPreservationEventRecord Copy()
    {
        return new ReadingContextPreservationEventRecord(
            SequenceNumber,
            OccurredAtUnixMs,
            ElapsedSinceStartMs,
            ContextPreservation.Copy());
    }
}

public sealed record ScheduledInterventionEventRecord(
    long SequenceNumber,
    long OccurredAtUnixMs,
    long? ElapsedSinceStartMs,
    PendingInterventionSnapshot PendingIntervention)
{
    public ScheduledInterventionEventRecord Copy()
    {
        return new ScheduledInterventionEventRecord(
            SequenceNumber,
            OccurredAtUnixMs,
            ElapsedSinceStartMs,
            PendingIntervention.Copy());
    }
}

public sealed record ReadingSessionStateRecord(
    long SequenceNumber,
    string Reason,
    long OccurredAtUnixMs,
    long? ElapsedSinceStartMs,
    LiveReadingSessionSnapshot Session)
{
    public ReadingSessionStateRecord Copy()
    {
        return new ReadingSessionStateRecord(
            SequenceNumber,
            Reason,
            OccurredAtUnixMs,
            ElapsedSinceStartMs,
            Session.Copy());
    }
}

public sealed record ExperimentReplaySensing(
    IReadOnlyList<RawGazeSampleRecord> GazeSamples)
{
    public ExperimentReplaySensing Copy()
    {
        return new ExperimentReplaySensing(
            GazeSamples is null ? [] : [.. GazeSamples.Select(item => item.Copy())]);
    }
}

public sealed record ExperimentReplayDerived(
    IReadOnlyList<ParticipantViewportEventRecord> ViewportEvents,
    IReadOnlyList<ReadingFocusEventRecord> FocusEvents,
    IReadOnlyList<ReadingAttentionEventRecord> AttentionEvents,
    IReadOnlyList<ReadingContextPreservationEventRecord> ContextPreservationEvents)
{
    public ExperimentReplayDerived Copy()
    {
        return new ExperimentReplayDerived(
            ViewportEvents is null ? [] : [.. ViewportEvents.Select(item => item.Copy())],
            FocusEvents is null ? [] : [.. FocusEvents.Select(item => item.Copy())],
            AttentionEvents is null ? [] : [.. AttentionEvents.Select(item => item.Copy())],
            ContextPreservationEvents is null ? [] : [.. ContextPreservationEvents.Select(item => item.Copy())]);
    }
}

public sealed record ExperimentReplayInterventions(
    IReadOnlyList<DecisionProposalEventRecord> DecisionProposals,
    IReadOnlyList<ScheduledInterventionEventRecord> ScheduledInterventions,
    IReadOnlyList<InterventionEventRecord> InterventionEvents)
{
    public ExperimentReplayInterventions Copy()
    {
        return new ExperimentReplayInterventions(
            DecisionProposals is null ? [] : [.. DecisionProposals.Select(item => item.Copy())],
            ScheduledInterventions is null ? [] : [.. ScheduledInterventions.Select(item => item.Copy())],
            InterventionEvents is null ? [] : [.. InterventionEvents.Select(item => item.Copy())]);
    }
}

public sealed record ExperimentReplayBaseline(
    ReadingPresentationSnapshot Presentation,
    ReaderAppearanceSnapshot Appearance)
{
    public ExperimentReplayBaseline Copy()
    {
        return new ExperimentReplayBaseline(
            Presentation.Copy(),
            Appearance.Copy());
    }
}

public sealed record ExperimentReplayData(
    ExperimentReplayBaseline Baseline)
{
    public ExperimentReplayData Copy()
    {
        return new ExperimentReplayData(Baseline.Copy());
    }
}

public sealed record ExperimentReplayAnnotation(
    string Id,
    long SequenceNumber,
    long OccurredAtUnixMs,
    long? ElapsedSinceStartMs,
    string? Author,
    string? Category,
    string Note,
    string? TargetTokenId,
    string? TargetBlockId)
{
    public ExperimentReplayAnnotation Copy()
    {
        return this with { };
    }
}

public sealed record ExperimentReplayExport(
    ExperimentReplayExportManifest Manifest,
    ExperimentReplayContext Experiment,
    ExperimentReplayContent Content,
    ExperimentReplaySensing Sensing,
    ExperimentReplayDerived Derived,
    ExperimentReplayInterventions Interventions,
    ExperimentReplayData Replay,
    IReadOnlyList<ExperimentReplayAnnotation> Annotations)
{
    public ExperimentReplayExport Copy()
    {
        return new ExperimentReplayExport(
            Manifest.Copy(),
            Experiment.Copy(),
            Content.Copy(),
            Sensing.Copy(),
            Derived.Copy(),
            Interventions.Copy(),
            Replay.Copy(),
            Annotations is null ? [] : [.. Annotations.Select(item => item.Copy())]);
    }
}

public sealed record ExperimentLifecycleEventRecord(
    long SequenceNumber,
    string EventType,
    string Source,
    long OccurredAtUnixMs,
    long? ElapsedSinceStartMs)
{
    public ExperimentLifecycleEventRecord Copy()
    {
        return this with { };
    }
}

public sealed record ParticipantViewportEventRecord(
    long SequenceNumber,
    long OccurredAtUnixMs,
    long? ElapsedSinceStartMs,
    ParticipantViewportSnapshot Viewport)
{
    public ParticipantViewportEventRecord Copy()
    {
        return new ParticipantViewportEventRecord(
            SequenceNumber,
            OccurredAtUnixMs,
            ElapsedSinceStartMs,
            Viewport.Copy());
    }
}

public sealed record ReadingFocusEventRecord(
    long SequenceNumber,
    long OccurredAtUnixMs,
    long? ElapsedSinceStartMs,
    ReadingFocusSnapshot Focus)
{
    public ReadingFocusEventRecord Copy()
    {
        return new ReadingFocusEventRecord(
            SequenceNumber,
            OccurredAtUnixMs,
            ElapsedSinceStartMs,
            Focus.Copy());
    }
}

public sealed record DecisionProposalEventRecord(
    long SequenceNumber,
    long OccurredAtUnixMs,
    long? ElapsedSinceStartMs,
    DecisionProposalSnapshot Proposal)
{
    public DecisionProposalEventRecord Copy()
    {
        return new DecisionProposalEventRecord(
            SequenceNumber,
            OccurredAtUnixMs,
            ElapsedSinceStartMs,
            Proposal.Copy());
    }
}

public sealed record InterventionEventRecord(
    long SequenceNumber,
    long OccurredAtUnixMs,
    long? ElapsedSinceStartMs,
    InterventionEventSnapshot Intervention)
{
    public InterventionEventRecord Copy()
    {
        return new InterventionEventRecord(
            SequenceNumber,
            OccurredAtUnixMs,
            ElapsedSinceStartMs,
            Intervention.Copy());
    }
}
