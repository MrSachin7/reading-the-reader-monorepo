namespace ReadingTheReader.core.Domain;

public sealed record ExperimentSession(
    Guid? Id,
    bool IsActive,
    long StartedAtUnixMs,
    long? StoppedAtUnixMs,
    Participant? Participant = null,
    EyeTrackerDevice? EyeTrackerDevice = null)
{
    public static ExperimentSession Inactive { get; } = new(null, false, 0, null);

    public static ExperimentSession StartNew(
        long startedAtUnixMs,
        Participant? participant = null,
        EyeTrackerDevice? eyeTrackerDevice = null)
    {
        return new ExperimentSession(Guid.NewGuid(), true, startedAtUnixMs, null, participant, eyeTrackerDevice);
    }

    public ExperimentSession Stop(long stoppedAtUnixMs)
    {
        return this with
        {
            IsActive = false,
            StoppedAtUnixMs = stoppedAtUnixMs
        };
    }
}
