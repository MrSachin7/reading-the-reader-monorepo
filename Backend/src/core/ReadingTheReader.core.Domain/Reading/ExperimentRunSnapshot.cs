namespace ReadingTheReader.core.Domain.Reading;

public sealed record ExperimentMaterialRunSnapshot(
    string Id,
    int Order,
    string Title,
    string Markdown,
    string? SourceSetupId,
    ReadingPresentationSnapshot Presentation)
{
    public ExperimentMaterialRunSnapshot Copy()
    {
        return new ExperimentMaterialRunSnapshot(
            Id,
            Order,
            Title,
            Markdown,
            SourceSetupId,
            (Presentation ?? ReadingPresentationSnapshot.Default).Copy());
    }
}

public sealed record ExperimentRunSnapshot(
    string? SourceExperimentSetupId,
    string? SourceExperimentSetupName,
    bool IsOneOff,
    string OrderMode,
    IReadOnlyList<ExperimentMaterialRunSnapshot> Materials,
    long CreatedAtUnixMs)
{
    public ExperimentRunSnapshot Copy()
    {
        return new ExperimentRunSnapshot(
            SourceExperimentSetupId,
            SourceExperimentSetupName,
            IsOneOff,
            string.IsNullOrWhiteSpace(OrderMode) ? "fixed" : OrderMode,
            Materials is null ? [] : [.. Materials.Select(item => item.Copy())],
            CreatedAtUnixMs);
    }
}
