using ReadingTheReader.core.Application.ApplicationContracts.ReadingMaterialSetups;
using ReadingTheReader.core.Application.InfrastructureContracts;

namespace ReadingTheReader.Realtime.Persistence;

public sealed class InMemoryReadingMaterialSetupStoreAdapter : IReadingMaterialSetupStoreAdapter
{
    private readonly object _syncRoot = new();
    private readonly Dictionary<string, ReadingMaterialSetup> _items = new(StringComparer.Ordinal);

    public ValueTask<ReadingMaterialSetup> SaveAsync(SaveReadingMaterialSetupCommand command, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();

        var id = Guid.NewGuid().ToString("N");
        var createdAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        var setup = new ReadingMaterialSetup
        {
            Id = id,
            Title = command.Title.Trim(),
            Markdown = command.Markdown,
            FileName = BuildUniqueFileName(command.Title, id),
            CreatedAtUnixMs = createdAtUnixMs,
            UpdatedAtUnixMs = createdAtUnixMs,
            FontFamily = NormalizeFontFamily(command.FontFamily),
            FontSizePx = NormalizeFontSize(command.FontSizePx),
            LineWidthPx = NormalizeLineWidth(command.LineWidthPx),
            LineHeight = NormalizeLineHeight(command.LineHeight),
            LetterSpacingEm = command.LetterSpacingEm,
            EditableByExperimenter = command.EditableByExperimenter
        };

        lock (_syncRoot)
        {
            _items[id] = setup;
        }

        return ValueTask.FromResult(setup);
    }

    public ValueTask<IReadOnlyCollection<ReadingMaterialSetup>> ListAsync(CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();

        ReadingMaterialSetup[] items;
        lock (_syncRoot)
        {
            items = _items.Values
                .OrderByDescending(item => item.UpdatedAtUnixMs)
                .ToArray();
        }

        return ValueTask.FromResult<IReadOnlyCollection<ReadingMaterialSetup>>(items);
    }

    public ValueTask<ReadingMaterialSetup?> GetByIdAsync(string id, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();

        lock (_syncRoot)
        {
            _items.TryGetValue(id, out var item);
            return ValueTask.FromResult(item);
        }
    }

    public ValueTask<ReadingMaterialSetup?> UpdateAsync(UpdateReadingMaterialSetupCommand command, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();

        lock (_syncRoot)
        {
            if (!_items.TryGetValue(command.Id, out var existing))
            {
                return ValueTask.FromResult<ReadingMaterialSetup?>(null);
            }

            var updated = new ReadingMaterialSetup
            {
                Id = existing.Id,
                Title = command.Title.Trim(),
                Markdown = command.Markdown,
                FileName = existing.FileName,
                CreatedAtUnixMs = existing.CreatedAtUnixMs,
                UpdatedAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                FontFamily = NormalizeFontFamily(command.FontFamily),
                FontSizePx = NormalizeFontSize(command.FontSizePx),
                LineWidthPx = NormalizeLineWidth(command.LineWidthPx),
                LineHeight = NormalizeLineHeight(command.LineHeight),
                LetterSpacingEm = command.LetterSpacingEm,
                EditableByExperimenter = command.EditableByExperimenter
            };

            _items[command.Id] = updated;
            return ValueTask.FromResult<ReadingMaterialSetup?>(updated);
        }
    }

    private static string BuildUniqueFileName(string title, string id)
    {
        var slug = FileReadingMaterialSetupStoreAdapter.SanitizeFileNameSegment(title);
        return $"{slug}-{id[..8]}.md";
    }

    private static string NormalizeFontFamily(string fontFamily) => string.IsNullOrWhiteSpace(fontFamily) ? "inter" : fontFamily.Trim();

    private static int NormalizeFontSize(int fontSizePx) => fontSizePx <= 0 ? 18 : fontSizePx;

    private static int NormalizeLineWidth(int lineWidthPx) => lineWidthPx <= 0 ? 700 : lineWidthPx;

    private static double NormalizeLineHeight(double lineHeight) => lineHeight <= 0 ? 1.6 : lineHeight;
}
