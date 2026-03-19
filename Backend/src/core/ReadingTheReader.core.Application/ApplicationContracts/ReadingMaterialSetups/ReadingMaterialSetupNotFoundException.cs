namespace ReadingTheReader.core.Application.ApplicationContracts.ReadingMaterialSetups;

public sealed class ReadingMaterialSetupNotFoundException : Exception
{
    public ReadingMaterialSetupNotFoundException(string id) : base($"Reading material setup '{id}' was not found.")
    {
    }
}
