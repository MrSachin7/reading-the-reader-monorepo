using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Decisioning;
using ReadingTheReader.core.Domain.EyeMovementAnalysis;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Reading;
using ReadingTheReader.core.Domain;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Sensing;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;

public sealed record ExperimentSetupBlockerSnapshot(
    string StepKey,
    string StepLabel,
    string Reason)
{
    public ExperimentSetupBlockerSnapshot Copy()
    {
        return new ExperimentSetupBlockerSnapshot(
            StepKey,
            StepLabel,
            Reason);
    }
}

public sealed record EyeTrackerSetupReadinessSnapshot(
    bool IsReady,
    bool HasSelectedEyeTracker,
    bool HasAppliedLicence,
    bool HasSavedLicence,
    bool SavedLicenceMissing,
    string? SelectedTrackerSerialNumber,
    string? SelectedTrackerName,
    string? BlockReason)
{
    public EyeTrackerSetupReadinessSnapshot Copy()
    {
        return new EyeTrackerSetupReadinessSnapshot(
            IsReady,
            HasSelectedEyeTracker,
            HasAppliedLicence,
            HasSavedLicence,
            SavedLicenceMissing,
            SelectedTrackerSerialNumber,
            SelectedTrackerName,
            BlockReason);
    }
}

public sealed record ParticipantSetupReadinessSnapshot(
    bool IsReady,
    bool HasParticipant,
    string? ParticipantName,
    string? BlockReason)
{
    public ParticipantSetupReadinessSnapshot Copy()
    {
        return new ParticipantSetupReadinessSnapshot(
            IsReady,
            HasParticipant,
            ParticipantName,
            BlockReason);
    }
}

public sealed record CalibrationSetupReadinessSnapshot(
    bool IsReady,
    bool HasCalibrationSession,
    bool IsCalibrationApplied,
    bool IsValidationPassed,
    string Status,
    string ValidationStatus,
    string? ValidationQuality,
    double? AverageAccuracyDegrees,
    double? AveragePrecisionDegrees,
    int SampleCount,
    string? BlockReason)
{
    public CalibrationSetupReadinessSnapshot Copy()
    {
        return new CalibrationSetupReadinessSnapshot(
            IsReady,
            HasCalibrationSession,
            IsCalibrationApplied,
            IsValidationPassed,
            Status,
            ValidationStatus,
            ValidationQuality,
            AverageAccuracyDegrees,
            AveragePrecisionDegrees,
            SampleCount,
            BlockReason);
    }
}

public sealed record ReadingMaterialSetupReadinessSnapshot(
    bool IsReady,
    bool HasReadingMaterial,
    string? DocumentId,
    string? Title,
    string? SourceSetupId,
    bool UsesSavedSetup,
    long? ConfiguredAtUnixMs,
    bool AllowsResearcherPresentationChanges,
    bool IsPresentationLocked,
    string? BlockReason)
{
    public ReadingMaterialSetupReadinessSnapshot Copy()
    {
        return new ReadingMaterialSetupReadinessSnapshot(
            IsReady,
            HasReadingMaterial,
            DocumentId,
            Title,
            SourceSetupId,
            UsesSavedSetup,
            ConfiguredAtUnixMs,
            AllowsResearcherPresentationChanges,
            IsPresentationLocked,
            BlockReason);
    }
}

public sealed record ExperimentSetupSnapshot(
    bool IsReadyForSessionStart,
    int CurrentStepIndex,
    ExperimentSetupBlockerSnapshot? CurrentBlocker,
    EyeTrackerSetupReadinessSnapshot EyeTracker,
    ParticipantSetupReadinessSnapshot Participant,
    CalibrationSetupReadinessSnapshot Calibration,
    ReadingMaterialSetupReadinessSnapshot ReadingMaterial)
{
    public ExperimentSetupSnapshot Copy()
    {
        return new ExperimentSetupSnapshot(
            IsReadyForSessionStart,
            CurrentStepIndex,
            CurrentBlocker?.Copy(),
            EyeTracker.Copy(),
            Participant.Copy(),
            Calibration.Copy(),
            ReadingMaterial.Copy());
    }
}

public sealed record ExperimentLiveMonitoringSnapshot(
    bool CanStartSession,
    bool CanFinishSession,
    bool IsGazeStreamingActive,
    int GazeSubscriberCount,
    bool HasParticipantViewConnection,
    bool HasParticipantViewportData,
    long? ParticipantViewportUpdatedAtUnixMs,
    bool HasReadingFocusSignal,
    long? FocusUpdatedAtUnixMs)
{
    public static ExperimentLiveMonitoringSnapshot Empty { get; } = new(
        false,
        false,
        false,
        0,
        false,
        false,
        null,
        false,
        null);

    public ExperimentLiveMonitoringSnapshot Copy()
    {
        return new ExperimentLiveMonitoringSnapshot(
            CanStartSession,
            CanFinishSession,
            IsGazeStreamingActive,
            GazeSubscriberCount,
            HasParticipantViewConnection,
            HasParticipantViewportData,
            ParticipantViewportUpdatedAtUnixMs,
            HasReadingFocusSignal,
            FocusUpdatedAtUnixMs);
    }
}

public sealed record ExternalProviderStatusSnapshot(
    bool IsConnected,
    string Status,
    string? ProviderId,
    string? DisplayName,
    bool SupportsAdvisoryExecution,
    bool SupportsAutonomousExecution,
    IReadOnlyList<string> SupportedInterventionModuleIds,
    long? LastHeartbeatAtUnixMs)
{
    public static ExternalProviderStatusSnapshot Disconnected { get; } = new(
        false,
        "disconnected",
        null,
        null,
        false,
        false,
        [],
        null);

    public ExternalProviderStatusSnapshot Copy()
    {
        return new ExternalProviderStatusSnapshot(
            IsConnected,
            Status,
            ProviderId,
            DisplayName,
            SupportsAdvisoryExecution,
            SupportsAutonomousExecution,
            SupportedInterventionModuleIds is null ? [] : [.. SupportedInterventionModuleIds],
            LastHeartbeatAtUnixMs);
    }
}

public sealed record EyeMovementAnalysisProviderStatusSnapshot(
    bool IsConnected,
    string Status,
    string? ProviderId,
    string? DisplayName,
    long? LastHeartbeatAtUnixMs)
{
    public static EyeMovementAnalysisProviderStatusSnapshot Disconnected { get; } = new(
        false,
        "disconnected",
        null,
        null,
        null);

    public EyeMovementAnalysisProviderStatusSnapshot Copy()
    {
        return new EyeMovementAnalysisProviderStatusSnapshot(
            IsConnected,
            Status,
            ProviderId,
            DisplayName,
            LastHeartbeatAtUnixMs);
    }
}

public sealed record ExperimentSessionSnapshot(
    Guid? SessionId,
    bool IsActive,
    long StartedAtUnixMs,
    long? StoppedAtUnixMs,
    Participant? Participant,
    EyeTrackerDevice? EyeTrackerDevice,
    string SensingMode,
    CalibrationSessionSnapshot Calibration,
    ExperimentSetupSnapshot Setup,
    long ReceivedGazeSamples,
    GazeData? LatestGazeSample,
    int ConnectedClients,
    ExperimentLiveMonitoringSnapshot LiveMonitoring,
    ExternalProviderStatusSnapshot ExternalProviderStatus,
    LiveReadingSessionSnapshot? ReadingSession,
    DecisionConfigurationSnapshot DecisionConfiguration,
    DecisionRuntimeStateSnapshot DecisionState,
    EyeMovementAnalysisProviderStatusSnapshot? EyeMovementAnalysisProviderStatus = null,
    EyeMovementAnalysisConfigurationSnapshot? EyeMovementAnalysisConfiguration = null,
    EyeMovementAnalysisSnapshot? EyeMovementAnalysis = null
)
{
    public ExperimentSessionSnapshot Copy()
    {
        return new ExperimentSessionSnapshot(
            SessionId,
            IsActive,
            StartedAtUnixMs,
            StoppedAtUnixMs,
            Participant?.Copy(),
            EyeTrackerDevice?.Copy(),
            string.IsNullOrWhiteSpace(SensingMode) ? SensingModes.EyeTracker : SensingMode,
            Calibration is null ? CalibrationSessionSnapshots.CreateIdle() : CopyCalibration(Calibration),
            Setup is null
                ? new ExperimentSetupSnapshot(
                    false,
                    0,
                    null,
                    new EyeTrackerSetupReadinessSnapshot(false, false, false, false, false, null, null, null),
                    new ParticipantSetupReadinessSnapshot(false, false, null, null),
                    new CalibrationSetupReadinessSnapshot(false, false, false, false, "idle", "idle", null, null, null, 0, null),
                    new ReadingMaterialSetupReadinessSnapshot(false, false, null, null, null, false, null, false, false, null))
                : Setup.Copy(),
            ReceivedGazeSamples,
            LatestGazeSample?.Copy(),
            ConnectedClients,
            LiveMonitoring?.Copy() ?? ExperimentLiveMonitoringSnapshot.Empty.Copy(),
            ExternalProviderStatus?.Copy() ?? ExternalProviderStatusSnapshot.Disconnected.Copy(),
            ReadingSession?.Copy() ?? LiveReadingSessionSnapshot.Empty,
            DecisionConfiguration?.Copy() ?? DecisionConfigurationSnapshot.Default.Copy(),
            DecisionState?.Copy() ?? DecisionRuntimeStateSnapshot.Empty.Copy(),
            EyeMovementAnalysisProviderStatus?.Copy() ?? EyeMovementAnalysisProviderStatusSnapshot.Disconnected.Copy(),
            EyeMovementAnalysisConfiguration?.Copy() ?? EyeMovementAnalysisConfigurationSnapshot.Default.Copy(),
            EyeMovementAnalysis?.Copy() ?? EyeMovementAnalysisSnapshot.Empty.Copy());
    }

    private static CalibrationSessionSnapshot CopyCalibration(CalibrationSessionSnapshot source)
    {
        return new CalibrationSessionSnapshot(
            source.SessionId,
            source.Status,
            source.Pattern,
            source.StartedAtUnixMs,
            source.UpdatedAtUnixMs,
            source.CompletedAtUnixMs,
            CopyCalibrationPoints(source.Points),
            source.Result is null ? null : CopyCalibrationRunResult(source.Result),
            source.Validation is null ? CalibrationSessionSnapshots.CreateIdleValidation() : CopyValidation(source.Validation),
            source.Notes is null ? [] : [.. source.Notes]);
    }

    private static IReadOnlyList<CalibrationPointState> CopyCalibrationPoints(IReadOnlyList<CalibrationPointState>? points)
    {
        if (points is null || points.Count == 0)
        {
            return [];
        }

        var copies = new CalibrationPointState[points.Count];
        for (var i = 0; i < points.Count; i++)
        {
            copies[i] = CopyCalibrationPointState(points[i]);
        }

        return copies;
    }

    private static CalibrationPointState CopyCalibrationPointState(CalibrationPointState source)
    {
        return new CalibrationPointState(
            source.PointId,
            source.Label,
            source.X,
            source.Y,
            source.Status,
            source.Attempts,
            source.CollectedAtUnixMs,
            source.HardwareStatus,
            source.Notes is null ? [] : [.. source.Notes]);
    }

    private static CalibrationRunResult CopyCalibrationRunResult(CalibrationRunResult source)
    {
        return new CalibrationRunResult(
            source.Status,
            source.Applied,
            source.CalibrationPointCount,
            source.AcceptedPoints is null ? [] : [.. source.AcceptedPoints],
            source.Validation is null ? null : CopyValidationResult(source.Validation),
            source.Notes is null ? [] : [.. source.Notes]);
    }

    private static CalibrationValidationSnapshot CopyValidation(CalibrationValidationSnapshot source)
    {
        return new CalibrationValidationSnapshot(
            source.Status,
            source.StartedAtUnixMs,
            source.UpdatedAtUnixMs,
            source.CompletedAtUnixMs,
            CopyValidationPoints(source.Points),
            source.Result is null ? null : CopyValidationResult(source.Result),
            source.Notes is null ? [] : [.. source.Notes]);
    }

    private static IReadOnlyList<CalibrationValidationPointState> CopyValidationPoints(
        IReadOnlyList<CalibrationValidationPointState>? points)
    {
        if (points is null || points.Count == 0)
        {
            return [];
        }

        var copies = new CalibrationValidationPointState[points.Count];
        for (var i = 0; i < points.Count; i++)
        {
            copies[i] = new CalibrationValidationPointState(
                points[i].PointId,
                points[i].Label,
                points[i].X,
                points[i].Y,
                points[i].Status,
                points[i].SampleCount,
                points[i].CollectedAtUnixMs,
                points[i].Notes is null ? [] : [.. points[i].Notes]);
        }

        return copies;
    }

    private static CalibrationValidationResult CopyValidationResult(CalibrationValidationResult source)
    {
        return new CalibrationValidationResult(
            source.Passed,
            source.Quality,
            source.AverageAccuracyDegrees,
            source.AveragePrecisionDegrees,
            source.SampleCount,
            source.Points is null
                ? []
                : source.Points.Select(point => new CalibrationValidationPointResult(
                    point.PointId,
                    point.Label,
                    point.X,
                    point.Y,
                    point.AverageAccuracyDegrees,
                    point.AveragePrecisionDegrees,
                    point.SampleCount,
                    point.Quality,
                    point.Notes is null ? [] : [.. point.Notes]))
                    .ToArray(),
            source.Notes is null ? [] : [.. source.Notes]);
    }
}
