namespace ReadingTheReader.core.Application.ApplicationContracts.ReadingMaterialSetups;

public sealed class ReadingMaterialSetupValidationException : Exception
{
    public ReadingMaterialSetupValidationException(string message) : base(message)
    {
    }
}
