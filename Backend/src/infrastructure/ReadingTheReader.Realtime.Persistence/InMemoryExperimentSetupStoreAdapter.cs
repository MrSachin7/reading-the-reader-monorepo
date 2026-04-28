using ReadingTheReader.core.Application.ApplicationContracts.ExperimentSetups;
using ReadingTheReader.core.Application.ApplicationContracts.ExperimentSetups.Commands;
using ReadingTheReader.core.Application.InfrastructureContracts;

namespace ReadingTheReader.Realtime.Persistence;

public sealed class InMemoryExperimentSetupStoreAdapter : IExperimentSetupStoreAdapter
{
    private readonly object _syncRoot = new();
    private readonly Dictionary<string, ExperimentSetup> _items = new(StringComparer.Ordinal);

    public ValueTask<ExperimentSetup> SaveAsync(SaveExperimentSetupCommand command, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();

        var id = Guid.NewGuid().ToString("N");
        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        var saved = new ExperimentSetup
        {
            Id = id,
            Name = command.Name.Trim(),
            Description = command.Description?.Trim() ?? string.Empty,
            CreatedAtUnixMs = now,
            UpdatedAtUnixMs = now,
            Items = command.Items.Select((item, index) => BuildItem(item, index, null)).ToArray()
        };

        lock (_syncRoot)
        {
            _items[id] = saved;
        }

        return ValueTask.FromResult(saved);
    }

    public ValueTask<IReadOnlyCollection<ExperimentSetup>> ListAsync(CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();

        ExperimentSetup[] items;
        lock (_syncRoot)
        {
            items = _items.Values
                .OrderByDescending(item => item.UpdatedAtUnixMs)
                .ToArray();
        }

        return ValueTask.FromResult<IReadOnlyCollection<ExperimentSetup>>(items);
    }

    public ValueTask<ExperimentSetup?> GetByIdAsync(string id, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();

        lock (_syncRoot)
        {
            _items.TryGetValue(id, out var item);
            return ValueTask.FromResult(item);
        }
    }

    public ValueTask<ExperimentSetup?> UpdateAsync(UpdateExperimentSetupCommand command, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();

        lock (_syncRoot)
        {
            if (!_items.TryGetValue(command.Id, out var existing))
            {
                return ValueTask.FromResult<ExperimentSetup?>(null);
            }

            var updated = new ExperimentSetup
            {
                Id = existing.Id,
                Name = command.Name.Trim(),
                Description = command.Description?.Trim() ?? string.Empty,
                CreatedAtUnixMs = existing.CreatedAtUnixMs,
                UpdatedAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                Items = command.Items.Select((item, index) => BuildItem(item, index, item.Id)).ToArray()
            };

            _items[command.Id] = updated;
            return ValueTask.FromResult<ExperimentSetup?>(updated);
        }
    }

    private static ExperimentSetupItem BuildItem(SaveExperimentSetupItemCommand item, int index, string? existingId)
    {
        return new ExperimentSetupItem
        {
            Id = string.IsNullOrWhiteSpace(existingId) ? Guid.NewGuid().ToString("N") : existingId.Trim(),
            Order = index,
            SourceReadingMaterialSetupId = string.IsNullOrWhiteSpace(item.SourceReadingMaterialSetupId) ? null : item.SourceReadingMaterialSetupId.Trim(),
            SourceReadingMaterialTitle = item.SourceReadingMaterialTitle.Trim(),
            Title = item.Title.Trim(),
            Markdown = item.Markdown,
            ResearcherQuestions = item.ResearcherQuestions ?? string.Empty,
            FontFamily = item.FontFamily.Trim(),
            FontSizePx = item.FontSizePx,
            LineWidthPx = item.LineWidthPx,
            LineHeight = item.LineHeight,
            LetterSpacingEm = item.LetterSpacingEm,
            EditableByExperimenter = item.EditableByExperimenter
        };
    }

    private static ExperimentSetupItem BuildItem(UpdateExperimentSetupItemCommand item, int index, string? existingId)
    {
        return BuildItem(new SaveExperimentSetupItemCommand
        {
            SourceReadingMaterialSetupId = item.SourceReadingMaterialSetupId,
            SourceReadingMaterialTitle = item.SourceReadingMaterialTitle,
            Title = item.Title,
            Markdown = item.Markdown,
            ResearcherQuestions = item.ResearcherQuestions,
            FontFamily = item.FontFamily,
            FontSizePx = item.FontSizePx,
            LineWidthPx = item.LineWidthPx,
            LineHeight = item.LineHeight,
            LetterSpacingEm = item.LetterSpacingEm,
            EditableByExperimenter = item.EditableByExperimenter
        }, index, existingId);
    }
}
