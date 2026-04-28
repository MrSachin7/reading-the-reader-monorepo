namespace ReadingTheReader.core.Application.ApplicationContracts.ExperimentSetups;

public sealed class ExperimentSetupNotFoundException : Exception
{
    public ExperimentSetupNotFoundException(string id)
        : base($"Experiment setup '{id}' was not found.")
    {
    }
}
