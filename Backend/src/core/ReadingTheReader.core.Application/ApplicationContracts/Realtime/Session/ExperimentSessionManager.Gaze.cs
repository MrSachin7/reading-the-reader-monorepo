using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Messaging;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Sensing;
using ReadingTheReader.core.Domain;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;

public sealed partial class ExperimentSessionManager
{
    public async ValueTask PauseGazeStreamingAsync(CancellationToken ct = default)
    {
        await _lifecycleGate.WaitAsync(ct);
        try
        {
            Interlocked.Exchange(ref _isGazeStreamingSuppressed, 1);
            StopHardwareStreaming();
        }
        finally
        {
            _lifecycleGate.Release();
        }
    }

    public async ValueTask ResumeGazeStreamingAsync(CancellationToken ct = default)
    {
        await _lifecycleGate.WaitAsync(ct);
        try
        {
            Interlocked.Exchange(ref _isGazeStreamingSuppressed, 0);
            await EnsureGazeStreamingStateAsync(ct);
        }
        finally
        {
            _lifecycleGate.Release();
        }
    }

    public void UpdateGazeSample(GazeData gazeData)
    {
        gazeData.Sanitize();
        var capturedAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        Interlocked.Increment(ref _receivedGazeSamples);
        Volatile.Write(ref _latestGazeSample, gazeData);
        RecordGazeSample(capturedAtUnixMs, gazeData);
    }

    private void OnGazeDataReceived(object? sender, GazeData gazeData)
    {
        var shouldPublishToProvider = ShouldPublishToExternalProvider();
        var shouldPublishToAnalysisProvider = ShouldPublishToExternalAnalysisProvider();
        if (_gazeSubscribers.IsEmpty && !shouldPublishToProvider && !shouldPublishToAnalysisProvider)
        {
            return;
        }

        UpdateGazeSample(gazeData);
        var subscribers = _gazeSubscribers.Keys.ToArray();
        var sendTask = BroadcastGazeSampleAsync(subscribers, shouldPublishToProvider, shouldPublishToAnalysisProvider, gazeData);
        if (!sendTask.IsCompletedSuccessfully)
        {
            _ = IgnoreFailuresAsync(sendTask.AsTask());
        }
    }

    public async ValueTask SubscribeGazeDataAsync(string connectionId, CancellationToken ct = default)
    {
        await _lifecycleGate.WaitAsync(ct);
        try
        {
            _gazeSubscribers[connectionId] = 0;

            try
            {
                await EnsureGazeStreamingStateAsync(ct);
            }
            catch (Exception ex)
            {
                Console.WriteLine(
                    $"SubscribeGazeData failed. ConnectionId={connectionId}, Reason=EyeTrackerNotReady, Error={ex.Message}");
                await _clientBroadcasterAdapter.SendToClientAsync(connectionId, MessageTypes.Error, new
                {
                    message = $"Cannot stream gaze data because the eye tracker is not ready or the licence has not been applied: {ex.Message}"
                }, ct);
            }
        }
        finally
        {
            _lifecycleGate.Release();
        }
    }

    public async ValueTask UnsubscribeGazeDataAsync(string connectionId, CancellationToken ct = default)
    {
        await _lifecycleGate.WaitAsync(ct);
        try
        {
            _gazeSubscribers.TryRemove(connectionId, out _);
            await EnsureGazeStreamingStateAsync(ct);
        }
        finally
        {
            _lifecycleGate.Release();
        }
    }

    public async ValueTask SubmitMouseGazeSampleAsync(string connectionId, GazeData gazeData, CancellationToken ct = default)
    {
        var session = Volatile.Read(ref _session);
        if (!string.Equals(_sensingModeSettingsService.CurrentMode, SensingModes.Mouse, StringComparison.Ordinal))
        {
            await _clientBroadcasterAdapter.SendToClientAsync(connectionId, MessageTypes.Error, new
            {
                message = "Mouse gaze samples are only accepted while mouse mode is active."
            }, ct);
            return;
        }

        if (!session.IsActive)
        {
            await _clientBroadcasterAdapter.SendToClientAsync(connectionId, MessageTypes.Error, new
            {
                message = "Mouse gaze samples are only accepted during an active experiment session."
            }, ct);
            return;
        }

        var shouldPublishToProvider = ShouldPublishToExternalProvider();
        var shouldPublishToAnalysisProvider = ShouldPublishToExternalAnalysisProvider();
        UpdateGazeSample(gazeData);
        await BroadcastGazeSampleAsync(
            _gazeSubscribers.Keys.ToArray(),
            shouldPublishToProvider,
            shouldPublishToAnalysisProvider,
            gazeData);
    }

    private async Task EnsureGazeStreamingStateAsync(CancellationToken ct)
    {
        var session = Volatile.Read(ref _session);
        var isMouseMode = string.Equals(_sensingModeSettingsService.CurrentMode, SensingModes.Mouse, StringComparison.Ordinal);
        var bypassingEyeTrackerReadiness =
            _experimentSetupTestingOptions.ForceEyeTrackerReady == true &&
            (session.EyeTrackerDevice is null ||
             string.IsNullOrWhiteSpace(session.EyeTrackerDevice.SerialNumber));
        var shouldStream =
            session.IsActive &&
            (!_gazeSubscribers.IsEmpty || ShouldPublishToExternalProvider() || ShouldPublishToExternalAnalysisProvider()) &&
                           Volatile.Read(ref _isGazeStreamingSuppressed) == 0;

        if (shouldStream)
        {
            if (isMouseMode)
            {
                return;
            }

            if (bypassingEyeTrackerReadiness)
            {
                return;
            }

            if (Interlocked.Exchange(ref _isSubscribedToHardware, 1) == 0)
            {
                _eyeTrackerAdapter.GazeDataReceived += OnGazeDataReceived;
            }

            if (Interlocked.Exchange(ref _isHardwareTracking, 1) == 0)
            {
                try
                {
                    await _eyeTrackerAdapter.StartEyeTracking();
                    Console.WriteLine(
                        $"Gaze streaming started. SessionId={session.Id}, Subscribers={_gazeSubscribers.Count}");
                }
                catch
                {
                    Interlocked.Exchange(ref _isHardwareTracking, 0);
                    if (Interlocked.Exchange(ref _isSubscribedToHardware, 0) == 1)
                    {
                        _eyeTrackerAdapter.GazeDataReceived -= OnGazeDataReceived;
                    }

                    throw;
                }
            }

            return;
        }

        StopHardwareStreaming();
        Console.WriteLine(
            $"Gaze streaming stopped. SessionId={session.Id}, Subscribers={_gazeSubscribers.Count}, SessionActive={session.IsActive}, Suppressed={Volatile.Read(ref _isGazeStreamingSuppressed) == 1}");
    }

    private async ValueTask BroadcastGazeSampleAsync(
        string[] subscribers,
        bool shouldPublishToProvider,
        bool shouldPublishToAnalysisProvider,
        GazeData gazeData)
    {
        foreach (var connectionId in subscribers)
        {
            await _clientBroadcasterAdapter.SendToClientAsync(connectionId, MessageTypes.GazeSample, gazeData);
        }

        if (shouldPublishToProvider)
        {
            await _externalProviderGateway.PublishGazeSampleAsync(GetCurrentSessionId(), gazeData, CancellationToken.None);
        }

        if (shouldPublishToAnalysisProvider)
        {
            await _analysisProviderGateway.PublishGazeSampleAsync(GetCurrentSessionId(), gazeData, CancellationToken.None);
        }
    }

    private void StopHardwareStreaming()
    {
        if (Interlocked.Exchange(ref _isHardwareTracking, 0) == 1)
        {
            _eyeTrackerAdapter.StopEyeTracking();
        }

        if (Interlocked.Exchange(ref _isSubscribedToHardware, 0) == 1)
        {
            _eyeTrackerAdapter.GazeDataReceived -= OnGazeDataReceived;
        }
    }
}
