using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Sensing;
using ReadingTheReader.core.Application.InfrastructureContracts;
using ReadingTheReader.core.Domain;
using Xunit;

namespace ReadingTheReader.Realtime.Persistence.Tests;

public sealed class SensingOperationsTests
{
    [Fact]
    public async Task SelectEyeTrackerAsync_WhenTrackerIsProFusion_DoesNotRequireLicence()
    {
        var eyeTrackerAdapter = new RealtimeTestDoubles.FakeEyeTrackerAdapter();
        eyeTrackerAdapter.SeedConnectedEyeTrackers(new EyeTrackerDevice
        {
            Name = "Tobii Pro Fusion",
            Model = "Tobii Pro Fusion",
            SerialNumber = "fusion-001",
            HasSavedLicence = false
        });
        var licenceStore = new FakeEyeTrackerLicenceStoreAdapter();
        var operations = new SensingOperations(eyeTrackerAdapter, licenceStore);

        var selected = await operations.SelectEyeTrackerAsync("fusion-001", null, saveLicence: false);

        Assert.Equal("fusion-001", selected.SerialNumber);
        Assert.False(selected.HasSavedLicence);
        Assert.Equal("fusion-001", eyeTrackerAdapter.SelectedSerialNumber);
        Assert.Null(eyeTrackerAdapter.SelectedLicenceBytes);
        Assert.Empty(licenceStore.SavedLicences);
    }

    [Fact]
    public async Task SelectEyeTrackerAsync_WhenTrackerRequiresLicenceAndNoneExists_RequiresLicenceFile()
    {
        var eyeTrackerAdapter = new RealtimeTestDoubles.FakeEyeTrackerAdapter();
        eyeTrackerAdapter.SeedConnectedEyeTrackers(new EyeTrackerDevice
        {
            Name = "Tobii Pro Nano",
            Model = "Tobii Pro Nano",
            SerialNumber = "nano-001",
            HasSavedLicence = false
        });
        var operations = new SensingOperations(eyeTrackerAdapter, new FakeEyeTrackerLicenceStoreAdapter());

        var error = await Assert.ThrowsAsync<ArgumentException>(() =>
            operations.SelectEyeTrackerAsync("nano-001", null, saveLicence: false));

        Assert.Equal("licenceFile is required when no saved licence exists for this eye tracker.", error.Message);
        Assert.Null(eyeTrackerAdapter.SelectedSerialNumber);
    }

    private sealed class FakeEyeTrackerLicenceStoreAdapter : IEyeTrackerLicenseStoreAdapter
    {
        private readonly Dictionary<string, byte[]> _licences = new(StringComparer.OrdinalIgnoreCase);

        public IReadOnlyDictionary<string, byte[]> SavedLicences => _licences;

        public Task<bool> HasLicenseAsync(string serialNumber, CancellationToken ct = default)
        {
            return Task.FromResult(_licences.ContainsKey(serialNumber));
        }

        public Task<byte[]?> GetLicenseAsync(string serialNumber, CancellationToken ct = default)
        {
            return Task.FromResult(_licences.TryGetValue(serialNumber, out var licence) ? licence : null);
        }

        public Task SaveLicenseAsync(string serialNumber, byte[] licenseFileBytes, CancellationToken ct = default)
        {
            _licences[serialNumber] = licenseFileBytes.ToArray();
            return Task.CompletedTask;
        }
    }
}
