using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Messaging;
using ReadingTheReader.core.Domain.Reading;
using ReadingTheReader.core.Domain;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;

public sealed partial class ExperimentSessionManager
{
    public async ValueTask<WebcamSensingStatusSnapshot> UpdateWebcamSensingStatusAsync(
        WebcamSensingStatusSnapshot status,
        CancellationToken ct = default)
    {
        WebcamSensingStatusSnapshot snapshot;

        await _lifecycleGate.WaitAsync(ct);
        try
        {
            snapshot = status.Copy();
            _webcamStatus = snapshot;
            RecordWebcamStatusEvent(
                snapshot.LastProcessedAtUnixMs
                    ?? snapshot.LastFrameAtUnixMs
                    ?? DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                snapshot);
        }
        finally
        {
            _lifecycleGate.Release();
        }

        await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.WebcamSensingStatusChanged, snapshot, ct);
        await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.ExperimentState, GetCurrentSnapshot(), ct);
        return snapshot;
    }

    public async ValueTask<FacialObservationSnapshot> UpdateFacialObservationAsync(
        FacialObservationSnapshot observation,
        CancellationToken ct = default)
    {
        FacialObservationSnapshot snapshot;

        await _lifecycleGate.WaitAsync(ct);
        try
        {
            snapshot = observation.Copy();
            _liveReadingSession = _liveReadingSession with
            {
                LatestFacialObservation = snapshot
            };
            RecordFacialObservationEvent(snapshot.CapturedAtUnixMs, snapshot);
        }
        finally
        {
            _lifecycleGate.Release();
        }

        await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.FacialObservationChanged, snapshot, ct);
        await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.ReadingSessionChanged, _liveReadingSession, ct);
        return snapshot;
    }

    public async ValueTask<FacialDifficultySignalSnapshot> UpdateFacialDifficultySignalAsync(
        FacialDifficultySignalSnapshot signal,
        CancellationToken ct = default)
    {
        FacialDifficultySignalSnapshot snapshot;

        await _lifecycleGate.WaitAsync(ct);
        try
        {
            snapshot = signal.Copy();
            var updatedHistory = new List<FacialDifficultySignalSnapshot> { snapshot };
            updatedHistory.AddRange(
                (_liveReadingSession.RecentFacialDifficultySignals ?? [])
                    .Where(item => item.ObservedAtUnixMs != snapshot.ObservedAtUnixMs || !string.Equals(item.State, snapshot.State, StringComparison.Ordinal))
                    .Take(9)
                    .Select(item => item.Copy()));

            _liveReadingSession = _liveReadingSession with
            {
                LatestFacialDifficultySignal = snapshot,
                RecentFacialDifficultySignals = updatedHistory
            };
            RecordFacialDifficultyEvent(snapshot.ObservedAtUnixMs, snapshot);
        }
        finally
        {
            _lifecycleGate.Release();
        }

        await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.FacialDifficultySignalChanged, snapshot, ct);
        await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.ReadingSessionChanged, _liveReadingSession, ct);
        return snapshot;
    }
}
