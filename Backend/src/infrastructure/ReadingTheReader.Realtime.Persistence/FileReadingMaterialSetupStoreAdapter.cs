using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using ReadingTheReader.core.Application.ApplicationContracts.ReadingMaterialSetups;
using ReadingTheReader.core.Application.InfrastructureContracts;

namespace ReadingTheReader.Realtime.Persistence;

public sealed class FileReadingMaterialSetupStoreAdapter : IReadingMaterialSetupStoreAdapter
{
    private static readonly Regex InvalidFileNameCharactersRegex = new($"[{Regex.Escape(new string(Path.GetInvalidFileNameChars()))}]", RegexOptions.Compiled);

    private readonly string _directoryPath;
    private readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    public FileReadingMaterialSetupStoreAdapter(string directoryPath)
    {
        _directoryPath = directoryPath;
    }

    public async ValueTask<ReadingMaterialSetup> SaveAsync(SaveReadingMaterialSetupCommand command, CancellationToken ct = default)
    {
        Directory.CreateDirectory(_directoryPath);

        var id = Guid.NewGuid().ToString("N");
        var createdAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        var fileName = BuildUniqueFileName(command.Title, id);
        var markdownPath = Path.Combine(_directoryPath, fileName);
        var metadataPath = GetMetadataPath(markdownPath);

        var metadata = new StoredReadingMaterialSetupMetadata
        {
            Id = id,
            Title = command.Title.Trim(),
            FileName = fileName,
            CreatedAtUnixMs = createdAtUnixMs,
            UpdatedAtUnixMs = createdAtUnixMs,
            FontFamily = command.FontFamily.Trim(),
            FontSizePx = command.FontSizePx,
            LineWidthPx = command.LineWidthPx,
            LineHeight = command.LineHeight,
            LetterSpacingEm = command.LetterSpacingEm,
            EditableByExperimenter = command.EditableByExperimenter
        };

        await File.WriteAllTextAsync(markdownPath, command.Markdown, Encoding.UTF8, ct);
        await WriteMetadataAsync(metadataPath, metadata, ct);
        return ToReadingMaterialSetup(metadata, command.Markdown);
    }

    public async ValueTask<IReadOnlyCollection<ReadingMaterialSetup>> ListAsync(CancellationToken ct = default)
    {
        if (!Directory.Exists(_directoryPath))
        {
            return Array.Empty<ReadingMaterialSetup>();
        }

        var metadataFiles = Directory.GetFiles(_directoryPath, "*.json", SearchOption.TopDirectoryOnly);
        var items = new List<ReadingMaterialSetup>(metadataFiles.Length);

        foreach (var metadataFile in metadataFiles)
        {
            var metadata = await ReadMetadataAsync(metadataFile, ct);
            if (metadata is null)
            {
                continue;
            }

            if (!File.Exists(Path.Combine(_directoryPath, metadata.FileName)))
            {
                continue;
            }

            items.Add(ToReadingMaterialSetup(metadata));
        }

        return items.OrderByDescending(item => item.UpdatedAtUnixMs).ToArray();
    }

    public async ValueTask<ReadingMaterialSetup?> GetByIdAsync(string id, CancellationToken ct = default)
    {
        if (!Directory.Exists(_directoryPath))
        {
            return null;
        }

        foreach (var metadataFile in Directory.GetFiles(_directoryPath, "*.json", SearchOption.TopDirectoryOnly))
        {
            var metadata = await ReadMetadataAsync(metadataFile, ct);
            if (metadata is null || !string.Equals(metadata.Id, id, StringComparison.Ordinal))
            {
                continue;
            }

            var markdownPath = Path.Combine(_directoryPath, metadata.FileName);
            if (!File.Exists(markdownPath))
            {
                return null;
            }

            return ToReadingMaterialSetup(metadata, await File.ReadAllTextAsync(markdownPath, ct));
        }

        return null;
    }

    public async ValueTask<ReadingMaterialSetup?> UpdateAsync(UpdateReadingMaterialSetupCommand command, CancellationToken ct = default)
    {
        if (!Directory.Exists(_directoryPath))
        {
            return null;
        }

        foreach (var metadataFile in Directory.GetFiles(_directoryPath, "*.json", SearchOption.TopDirectoryOnly))
        {
            var existingMetadata = await ReadMetadataAsync(metadataFile, ct);
            if (existingMetadata is null || !string.Equals(existingMetadata.Id, command.Id, StringComparison.Ordinal))
            {
                continue;
            }

            var markdownPath = Path.Combine(_directoryPath, existingMetadata.FileName);
            if (!File.Exists(markdownPath))
            {
                return null;
            }

            var updatedMetadata = new StoredReadingMaterialSetupMetadata
            {
                Id = existingMetadata.Id,
                Title = command.Title.Trim(),
                FileName = existingMetadata.FileName,
                CreatedAtUnixMs = existingMetadata.CreatedAtUnixMs,
                UpdatedAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                FontFamily = command.FontFamily.Trim(),
                FontSizePx = command.FontSizePx,
                LineWidthPx = command.LineWidthPx,
                LineHeight = command.LineHeight,
                LetterSpacingEm = command.LetterSpacingEm,
                EditableByExperimenter = command.EditableByExperimenter
            };

            await File.WriteAllTextAsync(markdownPath, command.Markdown, Encoding.UTF8, ct);
            await WriteMetadataAsync(metadataFile, updatedMetadata, ct);
            return ToReadingMaterialSetup(updatedMetadata, command.Markdown);
        }

        return null;
    }

    private string BuildUniqueFileName(string title, string id)
    {
        var slug = SanitizeFileNameSegment(title);
        return $"{slug}-{id[..8]}.md";
    }

    internal static string SanitizeFileNameSegment(string title)
    {
        var normalized = title.Trim().ToLowerInvariant();
        normalized = InvalidFileNameCharactersRegex.Replace(normalized, "-");
        normalized = Regex.Replace(normalized, @"\s+", "-");
        normalized = Regex.Replace(normalized, "-{2,}", "-");
        normalized = normalized.Trim('-', '.');
        return string.IsNullOrWhiteSpace(normalized) ? "reading-material-setup" : normalized;
    }

    private async ValueTask WriteMetadataAsync(string metadataPath, StoredReadingMaterialSetupMetadata metadata, CancellationToken ct)
    {
        var tempPath = $"{metadataPath}.tmp";
        await using (var stream = File.Create(tempPath))
        {
            await JsonSerializer.SerializeAsync(stream, metadata, _jsonOptions, ct);
        }

        File.Move(tempPath, metadataPath, overwrite: true);
    }

    private async ValueTask<StoredReadingMaterialSetupMetadata?> ReadMetadataAsync(string metadataPath, CancellationToken ct)
    {
        await using var stream = File.OpenRead(metadataPath);
        return await JsonSerializer.DeserializeAsync<StoredReadingMaterialSetupMetadata>(stream, _jsonOptions, ct);
    }

    private static string GetMetadataPath(string markdownPath) => Path.ChangeExtension(markdownPath, ".json");

    private static long GetUpdatedAtUnixMs(StoredReadingMaterialSetupMetadata metadata) => metadata.UpdatedAtUnixMs > 0 ? metadata.UpdatedAtUnixMs : metadata.CreatedAtUnixMs;

    private static ReadingMaterialSetup ToReadingMaterialSetup(StoredReadingMaterialSetupMetadata metadata, string markdown = "")
    {
        return new ReadingMaterialSetup
        {
            Id = metadata.Id,
            Title = metadata.Title,
            Markdown = markdown,
            FileName = metadata.FileName,
            CreatedAtUnixMs = metadata.CreatedAtUnixMs,
            UpdatedAtUnixMs = GetUpdatedAtUnixMs(metadata),
            FontFamily = string.IsNullOrWhiteSpace(metadata.FontFamily) ? "inter" : metadata.FontFamily,
            FontSizePx = metadata.FontSizePx <= 0 ? 18 : metadata.FontSizePx,
            LineWidthPx = metadata.LineWidthPx <= 0 ? 700 : metadata.LineWidthPx,
            LineHeight = metadata.LineHeight <= 0 ? 1.6 : metadata.LineHeight,
            LetterSpacingEm = metadata.LetterSpacingEm,
            EditableByExperimenter = metadata.EditableByExperimenter
        };
    }
}
