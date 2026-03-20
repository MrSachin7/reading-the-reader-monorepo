using ReadingTheReader.core.Application.ApplicationContracts.Realtime;

namespace ReadingTheReader.core.Application.InfrastructureContracts;

public interface IExperimentSessionJournalStoreAdapter
{
    void StartSession(ExperimentSessionSnapshot initialSnapshot);

    void AppendLifecycleEvent(Guid sessionId, ExperimentLifecycleEventRecord record);

    void AppendGazeSample(Guid sessionId, GazeSampleRecord record);

    void AppendReadingSessionState(Guid sessionId, ReadingSessionStateRecord record);

    void AppendParticipantViewportEvent(Guid sessionId, ParticipantViewportEventRecord record);

    void AppendReadingFocusEvent(Guid sessionId, ReadingFocusEventRecord record);

    void AppendInterventionEvent(Guid sessionId, InterventionEventRecord record);

    void MarkCompleted(Guid sessionId, string completionSource, long completedAtUnixMs);

    ExperimentJournalRecovery? LoadRecovery(Guid sessionId);
}
