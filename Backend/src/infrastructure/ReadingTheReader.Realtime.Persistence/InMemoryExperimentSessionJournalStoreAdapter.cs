using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
using ReadingTheReader.core.Application.InfrastructureContracts;

namespace ReadingTheReader.Realtime.Persistence;

public sealed class InMemoryExperimentSessionJournalStoreAdapter : IExperimentSessionJournalStoreAdapter
{
    public void StartSession(ExperimentSessionSnapshot initialSnapshot)
    {
    }

    public void AppendLifecycleEvent(Guid sessionId, ExperimentLifecycleEventRecord record)
    {
    }

    public void AppendGazeSample(Guid sessionId, GazeSampleRecord record)
    {
    }

    public void AppendReadingSessionState(Guid sessionId, ReadingSessionStateRecord record)
    {
    }

    public void AppendParticipantViewportEvent(Guid sessionId, ParticipantViewportEventRecord record)
    {
    }

    public void AppendReadingFocusEvent(Guid sessionId, ReadingFocusEventRecord record)
    {
    }

    public void AppendInterventionEvent(Guid sessionId, InterventionEventRecord record)
    {
    }

    public void MarkCompleted(Guid sessionId, string completionSource, long completedAtUnixMs)
    {
    }

    public ExperimentJournalRecovery? LoadRecovery(Guid sessionId)
    {
        return null;
    }
}
