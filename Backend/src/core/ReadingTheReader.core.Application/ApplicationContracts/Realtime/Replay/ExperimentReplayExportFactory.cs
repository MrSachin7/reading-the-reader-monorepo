using System.Security.Cryptography;
using System.Text;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;
using ReadingTheReader.core.Domain.Reading;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Replay;

public static class ExperimentReplayExportFactory
{
    public static ExperimentReplayExport Create(
        ExperimentSessionSnapshot initialSnapshot,
        ExperimentSessionSnapshot latestSnapshot,
        string completionSource,
        long exportedAtUnixMs,
        IReadOnlyList<ExperimentLifecycleEventRecord> lifecycleEvents,
        IReadOnlyList<RawGazeSampleRecord> gazeSamples,
        IReadOnlyList<ReadingSessionStateRecord> readingSessionStates,
        IReadOnlyList<ParticipantViewportEventRecord> participantViewportEvents,
        IReadOnlyList<ReadingFocusEventRecord> readingFocusEvents,
        IReadOnlyList<ReadingAttentionEventRecord> attentionEvents,
        IReadOnlyList<ReadingContextPreservationEventRecord> contextPreservationEvents,
        IReadOnlyList<DecisionProposalEventRecord> decisionProposalEvents,
        IReadOnlyList<ScheduledInterventionEventRecord> scheduledInterventionEvents,
        IReadOnlyList<InterventionEventRecord> interventionEvents,
        IReadOnlyDictionary<string, ReadingAttentionTokenSnapshot>? finalTokenStats = null,
        IReadOnlyList<QuizAnswerRecord>? quizAnswerEvents = null,
        IReadOnlyList<QuizLifecycleRecord>? quizLifecycleEvents = null,
        IReadOnlyList<QuizFocusRecord>? quizFocusEvents = null,
        IReadOnlyList<QuizSelectionRecord>? quizSelectionEvents = null)
    {
        return Create(
            initialSnapshot,
            latestSnapshot,
            completionSource,
            exportedAtUnixMs,
            lifecycleEvents,
            gazeSamples,
            readingSessionStates,
            [],
            [],
            [],
            participantViewportEvents,
            readingFocusEvents,
            attentionEvents,
            contextPreservationEvents,
            [],
            decisionProposalEvents,
            scheduledInterventionEvents,
            interventionEvents,
            finalTokenStats,
            quizAnswerEvents,
            quizLifecycleEvents,
            quizFocusEvents,
            quizSelectionEvents);
    }

    public static ExperimentReplayExport Create(
        ExperimentSessionSnapshot initialSnapshot,
        ExperimentSessionSnapshot latestSnapshot,
        string completionSource,
        long exportedAtUnixMs,
        IReadOnlyList<ExperimentLifecycleEventRecord> lifecycleEvents,
        IReadOnlyList<RawGazeSampleRecord> gazeSamples,
        IReadOnlyList<ReadingSessionStateRecord> readingSessionStates,
        IReadOnlyList<WebcamGazeSampleRecord> webcamGazeSamples,
        IReadOnlyList<WebcamSensingStatusRecord> webcamStatusEvents,
        IReadOnlyList<FacialObservationRecord> facialObservationEvents,
        IReadOnlyList<ParticipantViewportEventRecord> participantViewportEvents,
        IReadOnlyList<ReadingFocusEventRecord> readingFocusEvents,
        IReadOnlyList<ReadingAttentionEventRecord> attentionEvents,
        IReadOnlyList<ReadingContextPreservationEventRecord> contextPreservationEvents,
        IReadOnlyList<FacialDifficultyEventRecord> facialDifficultyEvents,
        IReadOnlyList<DecisionProposalEventRecord> decisionProposalEvents,
        IReadOnlyList<ScheduledInterventionEventRecord> scheduledInterventionEvents,
        IReadOnlyList<InterventionEventRecord> interventionEvents,
        IReadOnlyDictionary<string, ReadingAttentionTokenSnapshot>? finalTokenStats = null,
        IReadOnlyList<QuizAnswerRecord>? quizAnswerEvents = null,
        IReadOnlyList<QuizLifecycleRecord>? quizLifecycleEvents = null,
        IReadOnlyList<QuizFocusRecord>? quizFocusEvents = null,
        IReadOnlyList<QuizSelectionRecord>? quizSelectionEvents = null)
    {
        var normalizedCompletionSource = NormalizeNullableText(completionSource) ?? "unknown";
        var isLiveExport = latestSnapshot.IsActive &&
                           string.Equals(normalizedCompletionSource, "live", StringComparison.OrdinalIgnoreCase);
        var effectiveStoppedAtUnixMs = isLiveExport
            ? null
            : latestSnapshot.StoppedAtUnixMs ?? DetermineLastOccurredAtUnixMs(
                latestSnapshot.StartedAtUnixMs,
                lifecycleEvents,
                gazeSamples,
                webcamGazeSamples,
                webcamStatusEvents,
                facialObservationEvents,
                participantViewportEvents,
                readingFocusEvents,
                attentionEvents,
                contextPreservationEvents,
                facialDifficultyEvents,
                decisionProposalEvents,
                scheduledInterventionEvents,
                interventionEvents);

        var finalSnapshot = latestSnapshot with
        {
            IsActive = isLiveExport,
            StoppedAtUnixMs = effectiveStoppedAtUnixMs
        };

        long? durationMs = finalSnapshot.StartedAtUnixMs > 0 && finalSnapshot.StoppedAtUnixMs.HasValue
            ? Math.Max(0L, finalSnapshot.StoppedAtUnixMs.Value - finalSnapshot.StartedAtUnixMs)
            : null;

        var content = initialSnapshot.ReadingSession?.Content ?? finalSnapshot.ReadingSession?.Content;
        if (content is null)
        {
            throw new InvalidOperationException("Cannot export a replay without reading content.");
        }

        var baselinePresentation =
            initialSnapshot.ReadingSession?.Presentation?.Copy() ??
            finalSnapshot.ReadingSession?.Presentation?.Copy() ??
            ReadingPresentationSnapshot.Default.Copy();
        var baselineAppearance =
            initialSnapshot.ReadingSession?.Appearance?.Copy() ??
            finalSnapshot.ReadingSession?.Appearance?.Copy() ??
            ReaderAppearanceSnapshot.Default.Copy();
        var validationResult = finalSnapshot.Calibration.Validation.Result ?? finalSnapshot.Calibration.Result?.Validation;
        var participantScreen =
            finalSnapshot.ReadingSession?.ParticipantViewport?.Screen ??
            initialSnapshot.ReadingSession?.ParticipantViewport?.Screen ??
            participantViewportEvents
                .LastOrDefault(item => item.Viewport.Screen is not null)?
                .Viewport
                .Screen;

        return new ExperimentReplayExport(
            new ExperimentReplayExportManifest(
                ExperimentReplayExportSchema.Name,
                ExperimentReplayExportSchema.Version,
                exportedAtUnixMs,
                normalizedCompletionSource,
                "core",
                new ExperimentReplayExportProducer(
                    "reading-the-reader",
                    "Tobii.Research.x64",
                    "1.11.0.1334",
                    ExperimentReplayExportSchema.Version.ToString()),
                null),
            new ExperimentReplayContext(
                finalSnapshot.SessionId,
                finalSnapshot.StartedAtUnixMs,
                finalSnapshot.StoppedAtUnixMs,
                durationMs,
                finalSnapshot.DecisionConfiguration.Copy(),
                finalSnapshot.Participant is null
                    ? null
                    : new ExperimentReplayParticipant(
                        finalSnapshot.Participant.Name,
                        finalSnapshot.Participant.Age,
                        finalSnapshot.Participant.Sex,
                        finalSnapshot.Participant.ExistingEyeCondition,
                        finalSnapshot.Participant.ReadingProficiency),
                finalSnapshot.EyeTrackerDevice is null
                    ? null
                    : new ExperimentReplayDevice(
                        finalSnapshot.EyeTrackerDevice.Name,
                        finalSnapshot.EyeTrackerDevice.Model,
                        finalSnapshot.EyeTrackerDevice.SerialNumber,
                        finalSnapshot.EyeTrackerDevice.HasSavedLicence),
                participantScreen is null
                    ? null
                    : ExperimentReplayScreen.FromSnapshot(participantScreen),
                new ExperimentReplayCalibrationSummary(
                    NormalizeNullableText(finalSnapshot.Calibration.Pattern),
                    CalibrationSessionSnapshots.IsApplied(finalSnapshot.Calibration),
                    validationResult?.Passed == true,
                    NormalizeNullableText(validationResult?.Quality),
                    validationResult?.AverageAccuracyDegrees,
                    validationResult?.AveragePrecisionDegrees,
                    validationResult?.SampleCount ?? 0),
                lifecycleEvents.Select(item => item.Copy()).ToArray(),
                initialSnapshot.ReadingSession?.ExperimentRun?.Copy() ?? finalSnapshot.ReadingSession?.ExperimentRun?.Copy()),
            new ExperimentReplayContent(
                content.DocumentId,
                content.Title,
                content.Markdown,
                content.SourceSetupId,
                content.ExperimentSetupId,
                content.ExperimentSetupItemId,
                content.UpdatedAtUnixMs,
                ComputeContentHash(content.Markdown),
                new ExperimentReplayContentTokenization("minimal-markdown", "v1")),
            new ExperimentReplaySensing(
                finalSnapshot.SignalSources.Copy(),
                gazeSamples.Select(item => item.Copy()).ToArray(),
                webcamGazeSamples.Select(item => item.Copy()).ToArray(),
                webcamStatusEvents.Select(item => item.Copy()).ToArray(),
                facialObservationEvents.Select(item => item.Copy()).ToArray()),
            new ExperimentReplayDerived(
                participantViewportEvents.Select(item => item.Copy()).ToArray(),
                readingFocusEvents.Select(item => item.Copy()).ToArray(),
                attentionEvents.Select(item => item.Copy()).ToArray(),
                contextPreservationEvents.Select(item => item.Copy()).ToArray(),
                facialDifficultyEvents.Select(item => item.Copy()).ToArray(),
                finalTokenStats is null
                    ? null
                    : finalTokenStats.ToDictionary(e => e.Key, e => e.Value.Copy())),
            new ExperimentReplayInterventions(
                decisionProposalEvents.Select(item => item.Copy()).ToArray(),
                scheduledInterventionEvents.Select(item => item.Copy()).ToArray(),
                interventionEvents.Select(item => item.Copy()).ToArray()),
            new ExperimentReplayData(
                new ExperimentReplayBaseline(
                    baselinePresentation,
                    baselineAppearance),
                readingSessionStates.Select(item => item.Copy()).ToArray()),
            [],
            BuildQuizExport(quizAnswerEvents, quizLifecycleEvents, quizFocusEvents, quizSelectionEvents));
    }

    private static ExperimentReplayQuiz? BuildQuizExport(
        IReadOnlyList<QuizAnswerRecord>? answers,
        IReadOnlyList<QuizLifecycleRecord>? lifecycleEvents,
        IReadOnlyList<QuizFocusRecord>? focusEvents,
        IReadOnlyList<QuizSelectionRecord>? selectionEvents)
    {
        var hasAnyData = (answers?.Count ?? 0) > 0
            || (lifecycleEvents?.Count ?? 0) > 0
            || (focusEvents?.Count ?? 0) > 0
            || (selectionEvents?.Count ?? 0) > 0;
        if (!hasAnyData)
        {
            return null;
        }

        return new ExperimentReplayQuiz(
            answers is null ? [] : [.. answers.Select(item => item.Copy())],
            lifecycleEvents is null ? null : [.. lifecycleEvents.Select(item => item.Copy())],
            focusEvents is null ? null : [.. focusEvents.Select(item => item.Copy())],
            selectionEvents is null ? null : [.. selectionEvents.Select(item => item.Copy())]);
    }

    private static long? DetermineLastOccurredAtUnixMs(
        long startedAtUnixMs,
        IReadOnlyList<ExperimentLifecycleEventRecord> lifecycleEvents,
        IReadOnlyList<RawGazeSampleRecord> gazeSamples,
        IReadOnlyList<WebcamGazeSampleRecord> webcamGazeSamples,
        IReadOnlyList<WebcamSensingStatusRecord> webcamStatusEvents,
        IReadOnlyList<FacialObservationRecord> facialObservationEvents,
        IReadOnlyList<ParticipantViewportEventRecord> participantViewportEvents,
        IReadOnlyList<ReadingFocusEventRecord> readingFocusEvents,
        IReadOnlyList<ReadingAttentionEventRecord> attentionEvents,
        IReadOnlyList<ReadingContextPreservationEventRecord> contextPreservationEvents,
        IReadOnlyList<FacialDifficultyEventRecord> facialDifficultyEvents,
        IReadOnlyList<DecisionProposalEventRecord> decisionProposalEvents,
        IReadOnlyList<ScheduledInterventionEventRecord> scheduledInterventionEvents,
        IReadOnlyList<InterventionEventRecord> interventionEvents)
    {
        long? latest = null;

        static long? MaxOrNull(IEnumerable<long> values)
        {
            using var enumerator = values.GetEnumerator();
            if (!enumerator.MoveNext())
            {
                return null;
            }

            var current = enumerator.Current;
            while (enumerator.MoveNext())
            {
                if (enumerator.Current > current)
                {
                    current = enumerator.Current;
                }
            }

            return current;
        }

        void Consider(long? candidate)
        {
            if (!candidate.HasValue)
            {
                return;
            }

            latest = !latest.HasValue || candidate.Value > latest.Value ? candidate.Value : latest;
        }

        Consider(MaxOrNull(lifecycleEvents.Select(item => item.OccurredAtUnixMs)));
        Consider(MaxOrNull(gazeSamples.Select(item => item.CapturedAtUnixMs)));
        Consider(MaxOrNull(webcamGazeSamples.Select(item => item.CapturedAtUnixMs)));
        Consider(MaxOrNull(webcamStatusEvents.Select(item => item.OccurredAtUnixMs)));
        Consider(MaxOrNull(facialObservationEvents.Select(item => item.CapturedAtUnixMs)));
        Consider(MaxOrNull(participantViewportEvents.Select(item => item.OccurredAtUnixMs)));
        Consider(MaxOrNull(readingFocusEvents.Select(item => item.OccurredAtUnixMs)));
        Consider(MaxOrNull(attentionEvents.Select(item => item.OccurredAtUnixMs)));
        Consider(MaxOrNull(contextPreservationEvents.Select(item => item.OccurredAtUnixMs)));
        Consider(MaxOrNull(facialDifficultyEvents.Select(item => item.OccurredAtUnixMs)));
        Consider(MaxOrNull(decisionProposalEvents.Select(item => item.OccurredAtUnixMs)));
        Consider(MaxOrNull(scheduledInterventionEvents.Select(item => item.OccurredAtUnixMs)));
        Consider(MaxOrNull(interventionEvents.Select(item => item.OccurredAtUnixMs)));

        return latest ?? (startedAtUnixMs > 0 ? startedAtUnixMs : null);
    }

    private static string ComputeContentHash(string markdown)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(markdown));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    private static string? NormalizeNullableText(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
