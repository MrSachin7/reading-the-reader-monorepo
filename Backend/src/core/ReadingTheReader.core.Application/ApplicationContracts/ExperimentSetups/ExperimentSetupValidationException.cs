namespace ReadingTheReader.core.Application.ApplicationContracts.ExperimentSetups;

public sealed class ExperimentSetupValidationException : Exception
{
    public ExperimentSetupValidationException(string message)
        : base(message)
    {
    }
}
