using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Interventions;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Reading;
using Xunit;

namespace ReadingTheReader.Realtime.Persistence.Tests;

public sealed class InterventionModuleExecutionTests
{
    private readonly ReadingInterventionRuntime _sut =
        new(new ReadingInterventionModuleRegistry(BuiltInReadingInterventionModules.All));

    [Fact]
    public void Apply_ExecutesKnownModule()
    {
        var result = _sut.Apply(
            ReadingPresentationSnapshot.Default,
            ReaderAppearanceSnapshot.Default,
            new ApplyInterventionCommand(
                "manual",
                "researcher-ui",
                "Increase font size for readability",
                new ReadingPresentationPatch(null, null, null, null, null, null),
                new ReaderAppearancePatch(null, null, null),
                ReadingInterventionModuleIds.FontSize,
                new Dictionary<string, string?>
                {
                    ["fontSizePx"] = "22"
                }),
            12345);

        Assert.NotNull(result);
        Assert.Equal(22, result!.Presentation.FontSizePx);
        Assert.Equal(ReadingInterventionModuleIds.FontSize, result.Event.ModuleId);
        Assert.Equal("22", Assert.Contains("fontSizePx", result.Event.Parameters!));
    }

    [Fact]
    public void Apply_RejectsInvalidParameters()
    {
        var exception = Assert.Throws<ArgumentException>(() =>
            _sut.Apply(
                ReadingPresentationSnapshot.Default,
                ReaderAppearanceSnapshot.Default,
                new ApplyInterventionCommand(
                    "manual",
                    "researcher-ui",
                    "Invalid font size",
                    new ReadingPresentationPatch(null, null, null, null, null, null),
                    new ReaderAppearancePatch(null, null, null),
                    ReadingInterventionModuleIds.FontSize,
                    new Dictionary<string, string?>
                    {
                        ["fontSizePx"] = "99"
                    }),
                12345));

        Assert.Contains("between", exception.Message);
    }
}
