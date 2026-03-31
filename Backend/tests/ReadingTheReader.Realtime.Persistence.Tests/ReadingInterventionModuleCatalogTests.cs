using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
using Xunit;

namespace ReadingTheReader.Realtime.Persistence.Tests;

public sealed class ReadingInterventionModuleCatalogTests
{
    private readonly IReadingInterventionModuleRegistry _registry =
        new ReadingInterventionModuleRegistry(BuiltInReadingInterventionModules.All);

    [Fact]
    public void Catalog_ContainsCurrentResearcherControlModules()
    {
        var moduleIds = _registry.List().Select(descriptor => descriptor.ModuleId).ToArray();

        Assert.Equal(
            [
                ReadingInterventionModuleIds.ThemeMode,
                ReadingInterventionModuleIds.Palette,
                ReadingInterventionModuleIds.ParticipantEditLock,
                ReadingInterventionModuleIds.FontFamily,
                ReadingInterventionModuleIds.FontSize,
                ReadingInterventionModuleIds.LineWidth,
                ReadingInterventionModuleIds.LineHeight,
                ReadingInterventionModuleIds.LetterSpacing
            ],
            moduleIds);
    }

    [Fact]
    public void Descriptors_DeclareSupportedParameters()
    {
        var descriptors = _registry.List().ToDictionary(item => item.ModuleId, StringComparer.Ordinal);

        AssertParameter(descriptors, ReadingInterventionModuleIds.FontFamily, "fontFamily", ReadingInterventionValueKinds.String);
        AssertParameter(descriptors, ReadingInterventionModuleIds.FontSize, "fontSizePx", ReadingInterventionValueKinds.Integer);
        AssertParameter(descriptors, ReadingInterventionModuleIds.LineWidth, "lineWidthPx", ReadingInterventionValueKinds.Integer);
        AssertParameter(descriptors, ReadingInterventionModuleIds.LineHeight, "lineHeight", ReadingInterventionValueKinds.Number);
        AssertParameter(descriptors, ReadingInterventionModuleIds.LetterSpacing, "letterSpacingEm", ReadingInterventionValueKinds.Number);
        AssertParameter(descriptors, ReadingInterventionModuleIds.ThemeMode, "themeMode", ReadingInterventionValueKinds.String);
        AssertParameter(descriptors, ReadingInterventionModuleIds.Palette, "palette", ReadingInterventionValueKinds.String);
        AssertParameter(descriptors, ReadingInterventionModuleIds.ParticipantEditLock, "locked", ReadingInterventionValueKinds.Boolean);

        foreach (var descriptor in descriptors.Values)
        {
            Assert.False(string.IsNullOrWhiteSpace(descriptor.DisplayName));
            Assert.False(string.IsNullOrWhiteSpace(descriptor.Description));
        }
    }

    private static void AssertParameter(
        IReadOnlyDictionary<string, ReadingInterventionModuleDescriptor> descriptors,
        string moduleId,
        string parameterKey,
        string valueKind)
    {
        var descriptor = Assert.Contains(moduleId, descriptors);
        var parameter = Assert.Single(descriptor.Parameters);

        Assert.Equal(parameterKey, parameter.Key);
        Assert.Equal(valueKind, parameter.ValueKind);
        Assert.True(parameter.Required);
    }
}
