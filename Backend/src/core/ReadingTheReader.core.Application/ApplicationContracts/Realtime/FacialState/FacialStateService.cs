using Microsoft.Extensions.Hosting;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;
using ReadingTheReader.core.Application.InfrastructureContracts;
using ReadingTheReader.core.Domain;
using ReadingTheReader.core.Domain.Reading;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.FacialState;

public sealed class FacialStateService : IHostedService
{
    private readonly IFacialStateAdapter _adapter;
    private readonly ExperimentSessionManager _sessionManager;

    public FacialStateService(IFacialStateAdapter adapter, ExperimentSessionManager sessionManager)
    {
        _adapter = adapter;
        _sessionManager = sessionManager;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        _adapter.FacialObservationReceived += OnFacialObservationReceived;
        _adapter.GazeSampleDerived += OnGazeSampleDerived;
        _adapter.StatusChanged += OnStatusChanged;
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        _adapter.FacialObservationReceived -= OnFacialObservationReceived;
        _adapter.GazeSampleDerived -= OnGazeSampleDerived;
        _adapter.StatusChanged -= OnStatusChanged;
        return Task.CompletedTask;
    }

    private async void OnFacialObservationReceived(object? sender, FacialObservationSnapshot observation)
    {
        try
        {
            await _sessionManager.UpdateFacialObservationAsync(observation);
            await _sessionManager.UpdateFacialDifficultySignalAsync(
                ClassifyDifficultySignal(observation, observation.CapturedAtUnixMs));
        }
        catch (Exception ex)
        {
            Console.WriteLine($"FacialStateService observation error: {ex.Message}");
        }
    }

    private async void OnGazeSampleDerived(object? sender, GazeData gaze)
    {
        try
        {
            await _sessionManager.SubmitWebcamGazeSampleAsync(gaze, gaze.DeviceTimeStamp / 1000);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"FacialStateService gaze error: {ex.Message}");
        }
    }

    private async void OnStatusChanged(object? sender, WebcamSensingStatusSnapshot status)
    {
        try
        {
            await _sessionManager.UpdateWebcamSensingStatusAsync(status);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"FacialStateService status error: {ex.Message}");
        }
    }

    private static FacialDifficultySignalSnapshot ClassifyDifficultySignal(
        FacialObservationSnapshot observation,
        long observedAtUnixMs)
    {
        var cues = new List<string>();
        var state = FacialDifficultyStates.Neutral;

        if (observation.BlinkLikelihood >= 0.7)
            cues.Add("blink-rate-up");

        if (observation.MotionScore >= 0.28)
            cues.Add("head-motion");

        if (observation.MouthTension >= 0.52)
            cues.Add("mouth-tension");

        if (Math.Abs(observation.HeadOffsetX) >= 0.42 || Math.Abs(observation.HeadOffsetY) >= 0.42)
            cues.Add("off-center-face");

        if (cues.Count > 0)
        {
            state = FacialDifficultyStates.PossibleStruggle;
        }
        else if (observation.BlinkLikelihood < 0.26 && observation.MotionScore < 0.1 && observation.MouthTension < 0.22)
        {
            state = FacialDifficultyStates.PossibleEase;
            cues.Add("steady-face");
            cues.Add("low-motion");
        }

        return new FacialDifficultySignalSnapshot(
            state,
            Math.Clamp((observation.Confidence * 0.7d) + ((Math.Min(cues.Count, 3) / 3d) * 0.3d), 0, 1),
            observedAtUnixMs,
            cues,
            cues.Count == 0 ? "No strong landmark-derived cue." : string.Join(", ", cues));
    }
}
