namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Analysis;

public interface IEyeMovementAnalysisStrategyRegistry
{
    bool TryGetStrategy(string providerId, out IEyeMovementAnalysisStrategy? strategy);
}
