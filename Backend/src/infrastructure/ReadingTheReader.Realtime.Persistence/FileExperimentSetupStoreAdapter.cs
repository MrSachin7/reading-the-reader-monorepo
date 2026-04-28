using System.Text.Json;
using ReadingTheReader.core.Application.ApplicationContracts.ExperimentSetups;
using ReadingTheReader.core.Application.ApplicationContracts.ExperimentSetups.Commands;
using ReadingTheReader.core.Application.InfrastructureContracts;

namespace ReadingTheReader.Realtime.Persistence;

public sealed class FileExperimentSetupStoreAdapter : IExperimentSetupStoreAdapter
{
    private readonly string _directoryPath;
    private readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    public FileExperimentSetupStoreAdapter(string directoryPath)
    {
        _directoryPath = directoryPath;
    }

    public async ValueTask<ExperimentSetup> SaveAsync(SaveExperimentSetupCommand command, CancellationToken ct = default)
    {
        Directory.CreateDirectory(_directoryPath);

        var id = Guid.NewGuid().ToString("N");
        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        var stored = new StoredExperimentSetup
        {
            Id = id,
            Name = command.Name.Trim(),
            Description = command.Description?.Trim() ?? string.Empty,
            CreatedAtUnixMs = now,
            UpdatedAtUnixMs = now,
            Items = command.Items.Select((item, index) => ToStoredItem(item, index, null)).ToList()
        };

        var path = GetPath(id);
        await WriteAsync(path, stored, ct);
        return ToExperimentSetup(stored);
    }

    public async ValueTask<IReadOnlyCollection<ExperimentSetup>> ListAsync(CancellationToken ct = default)
    {
        if (!Directory.Exists(_directoryPath))
        {
            return Array.Empty<ExperimentSetup>();
        }

        var items = new List<ExperimentSetup>();
        foreach (var path in Directory.GetFiles(_directoryPath, "*.json", SearchOption.TopDirectoryOnly))
        {
            var stored = await ReadAsync(path, ct);
            if (stored is null)
            {
                continue;
            }

            items.Add(ToExperimentSetup(stored));
        }

        return items.OrderByDescending(item => item.UpdatedAtUnixMs).ToArray();
    }

    public async ValueTask<ExperimentSetup?> GetByIdAsync(string id, CancellationToken ct = default)
    {
        var path = GetPath(id);
        if (!File.Exists(path))
        {
            return null;
        }

        var stored = await ReadAsync(path, ct);
        return stored is null ? null : ToExperimentSetup(stored);
    }

    public async ValueTask<ExperimentSetup?> UpdateAsync(UpdateExperimentSetupCommand command, CancellationToken ct = default)
    {
        var path = GetPath(command.Id);
        if (!File.Exists(path))
        {
            return null;
        }

        var existing = await ReadAsync(path, ct);
        if (existing is null)
        {
            return null;
        }

        var updated = new StoredExperimentSetup
        {
            Id = existing.Id,
            Name = command.Name.Trim(),
            Description = command.Description?.Trim() ?? string.Empty,
            CreatedAtUnixMs = existing.CreatedAtUnixMs,
            UpdatedAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            Items = command.Items.Select((item, index) => ToStoredItem(item, index, item.Id)).ToList()
        };

        await WriteAsync(path, updated, ct);
        return ToExperimentSetup(updated);
    }

    private string GetPath(string id) => Path.Combine(_directoryPath, $"{id}.json");

    private async ValueTask WriteAsync(string path, StoredExperimentSetup stored, CancellationToken ct)
    {
        var tempPath = $"{path}.tmp";
        await using (var stream = File.Create(tempPath))
        {
            await JsonSerializer.SerializeAsync(stream, stored, _jsonOptions, ct);
        }

        File.Move(tempPath, path, overwrite: true);
    }

    private async ValueTask<StoredExperimentSetup?> ReadAsync(string path, CancellationToken ct)
    {
        await using var stream = File.OpenRead(path);
        return await JsonSerializer.DeserializeAsync<StoredExperimentSetup>(stream, _jsonOptions, ct);
    }

    private static StoredExperimentSetupItem ToStoredItem(SaveExperimentSetupItemCommand item, int index, string? existingId)
    {
        return new StoredExperimentSetupItem
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

    private static StoredExperimentSetupItem ToStoredItem(UpdateExperimentSetupItemCommand item, int index, string? existingId)
    {
        return ToStoredItem(new SaveExperimentSetupItemCommand
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

    private static ExperimentSetup ToExperimentSetup(StoredExperimentSetup stored)
    {
        return new ExperimentSetup
        {
            Id = stored.Id,
            Name = stored.Name,
            Description = stored.Description,
            CreatedAtUnixMs = stored.CreatedAtUnixMs,
            UpdatedAtUnixMs = stored.UpdatedAtUnixMs,
            Items = stored.Items
                .OrderBy(item => item.Order)
                .Select(item => new ExperimentSetupItem
                {
                    Id = item.Id,
                    Order = item.Order,
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
                })
                .ToArray()
        };
    }
}
