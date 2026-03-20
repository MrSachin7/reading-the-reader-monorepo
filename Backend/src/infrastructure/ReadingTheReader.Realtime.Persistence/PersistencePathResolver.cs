namespace ReadingTheReader.Realtime.Persistence;

internal static class PersistencePathResolver
{
    public static string GetPersistenceProjectDirectory()
    {
        var backendRoot = FindBackendRoot(Directory.GetCurrentDirectory())
                          ?? FindBackendRoot(AppContext.BaseDirectory);

        return backendRoot is null
            ? AppContext.BaseDirectory
            : Path.Combine(
                backendRoot,
                "src",
                "infrastructure",
                "ReadingTheReader.Realtime.Persistence");
    }

    public static string GetPersistenceDataDirectory()
    {
        return Path.Combine(GetPersistenceProjectDirectory(), "data");
    }

    public static string GetLicenseDirectory()
    {
        return Path.Combine(GetPersistenceProjectDirectory(), "licence");
    }

    public static string ResolvePath(string path)
    {
        if (string.IsNullOrWhiteSpace(path))
        {
            throw new ArgumentException("A path value is required.", nameof(path));
        }

        return Path.IsPathRooted(path)
            ? path
            : Path.GetFullPath(path, Directory.GetCurrentDirectory());
    }

    private static string? FindBackendRoot(string startPath)
    {
        var dir = new DirectoryInfo(startPath);

        while (dir is not null)
        {
            var persistenceProjectDirectory = Path.Combine(
                dir.FullName,
                "src",
                "infrastructure",
                "ReadingTheReader.Realtime.Persistence");
            var webApiProjectDirectory = Path.Combine(
                dir.FullName,
                "src",
                "ReadingTheReader.WebApi");

            if (Directory.Exists(persistenceProjectDirectory) &&
                Directory.Exists(webApiProjectDirectory))
            {
                return dir.FullName;
            }

            dir = dir.Parent;
        }

        return null;
    }
}
