# Testing Patterns

**Analysis Date:** 2026-03-26

## Test Framework

**Runner:**
- Backend tests use xUnit `2.9.3` with `Microsoft.NET.Test.Sdk` `17.14.1` in `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ReadingTheReader.Realtime.Persistence.Tests.csproj`.
- Config: no standalone `xunit.runner.json`, `jest.config.*`, `vitest.config.*`, `playwright.config.*`, or `cypress.config.*` file is detected for the active codebase.

**Assertion Library:**
- Backend tests use the built-in xUnit `Assert` API.
- No `FluentAssertions`, `Shouldly`, `Moq`, `NSubstitute`, `AutoFixture`, or frontend test library dependency is detected.

**Run Commands:**
```bash
dotnet test Backend/reading-the-reader-backend.sln
dotnet test Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ReadingTheReader.Realtime.Persistence.Tests.csproj
bun run build --cwd Frontend
```
- `dotnet test reading-the-reader-backend.sln` is documented in `Backend/README.md`.
- Frontend CI in `.github/workflows/frontend-ci.yml` checks whether `Frontend/package.json` has a `test` script before running tests. The current `Frontend/package.json` does not define one, so frontend tests are skipped in CI.

## Test File Organization

**Location:**
- Tests are in a dedicated backend test project under `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/`.
- Test files are separate from production code, not co-located.
- No committed `*.test.*` or `*.spec.*` files are detected under `Frontend/src`.

**Naming:**
- C# test filenames follow `SubjectTests.cs`, for example `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/FileReadingMaterialSetupStoreAdapterTests.cs` and `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ReadingInterventionRuntimeTests.cs`.
- Test method names follow `Method_Behavior_Expectation`, for example `SaveAsync_WritesMarkdownAndMetadata_AndReturnsSetup`.

**Structure:**
```text
Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/
  FileReadingMaterialSetupStoreAdapterTests.cs
  InMemoryReadingMaterialSetupStoreAdapterTests.cs
  FileExperimentReplayExportStoreAdapterTests.cs
  ExperimentReplayExportSerializerTests.cs
  ReadingInterventionRuntimeTests.cs
```

## Test Structure

**Suite Organization:**
```csharp
public sealed class FileReadingMaterialSetupStoreAdapterTests : IDisposable
{
    private readonly string _tempDirectory = Path.Combine(Path.GetTempPath(), "reading-material-setup-store-tests", Guid.NewGuid().ToString("N"));

    [Fact]
    public async Task SaveAsync_WritesMarkdownAndMetadata_AndReturnsSetup()
    {
        var sut = new FileReadingMaterialSetupStoreAdapter(_tempDirectory);
        var result = await sut.SaveAsync(new SaveReadingMaterialSetupCommand { Title = "My Custom Material", Markdown = "# Hello" });

        Assert.NotEmpty(result.Id);
        Assert.True(File.Exists(Path.Combine(_tempDirectory, result.FileName)));
    }
}
```
- Arrange/act/assert stays inline inside each `[Fact]`; there is no shared base test class.
- Helpers are local to the test file when needed, for example `CreateReplayExport()` in `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ExperimentReplayExportSerializerTests.cs` and `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/FileExperimentReplayExportStoreAdapterTests.cs`.
- Parameterized tests with `[Theory]` are not detected.

**Patterns:**
- Setup pattern: instantiate the concrete subject under test as `sut`, usually with a temp directory or real serializer dependency.
- Teardown pattern: implement `IDisposable` and delete temporary directories in `Dispose()`, as shown in `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/FileReadingMaterialSetupStoreAdapterTests.cs` and `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/FileExperimentReplayExportStoreAdapterTests.cs`.
- Assertion pattern: verify full domain behavior with `Assert.Equal`, `Assert.True`, `Assert.NotNull`, `Assert.Contains`, and `Assert.Matches`.

## Mocking

**Framework:** Not detected

**Patterns:**
```csharp
var sut = new InMemoryReadingMaterialSetupStoreAdapter();
var result = await sut.SaveAsync(new SaveReadingMaterialSetupCommand
{
    Title = "My Custom Material",
    Markdown = "# Hello"
});
```
- Tests prefer real collaborators over mocks. The current suite exercises `InMemory*` adapters, file-backed adapters, and the real `ExperimentReplayExportSerializer`.
- Rich domain fixtures are built manually inside helper methods instead of using a fixture library, for example `CreateReplayExport()` in `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ExperimentReplayExportSerializerTests.cs`.

**What to Mock:**
- No current mocking guidance is encoded in the codebase because no mocking framework is committed.

**What NOT to Mock:**
- The existing tests do not mock file I/O or serialization boundaries when those behaviors are the point of the test. `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/FileReadingMaterialSetupStoreAdapterTests.cs` and `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/FileExperimentReplayExportStoreAdapterTests.cs` use the real filesystem.

## Fixtures and Factories

**Test Data:**
```csharp
private static ExperimentReplayExport CreateReplayExport()
{
    var sessionId = Guid.Parse("9d0f4abc-6b53-4e54-a8fa-8f57c1a8cd11");
    var gaze = new GazeData { DeviceTimeStamp = 123, LeftEyeX = 10, LeftEyeY = 20 };
    return new ExperimentReplayExport(/* domain graph omitted for brevity in this pattern summary */);
}
```
- Domain fixtures are hand-built with concrete values inside the same file.
- Simple command inputs are usually created inline in each test body instead of through factory helpers.

**Location:**
- Fixture helpers live inside the test file that needs them.
- No shared `TestData`, `Fixtures`, or `Factories` directory is detected under `Backend/tests`.

## Coverage

**Requirements:** None enforced

**View Coverage:**
```bash
Not detected
```
- No `coverlet.collector`, `coverlet.msbuild`, or coverage threshold configuration is detected in `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ReadingTheReader.Realtime.Persistence.Tests.csproj` or the CI workflows.
- `.github/workflows/backend-ci.yml` runs build and test only. `.github/workflows/frontend-ci.yml` builds the frontend and only runs tests if a `test` script exists.

## Test Types

**Unit Tests:**
- `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ReadingInterventionRuntimeTests.cs` exercises pure application logic with direct assertions on returned domain objects.
- `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/InMemoryReadingMaterialSetupStoreAdapterTests.cs` exercises in-memory implementations as lightweight unit-style tests.

**Integration Tests:**
- `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/FileReadingMaterialSetupStoreAdapterTests.cs` and `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/FileExperimentReplayExportStoreAdapterTests.cs` are filesystem-backed integration tests with real persistence behavior.
- `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ExperimentReplayExportSerializerTests.cs` performs real serialization/deserialization round-trips.

**E2E Tests:**
- Not used.
- No backend host-level API tests are detected for `Backend/src/ReadingTheReader.WebApi/**`.
- No frontend component, hook, or browser tests are detected for `Frontend/src/**`.

## Common Patterns

**Async Testing:**
```csharp
var updated = await sut.UpdateAsync(new UpdateReadingMaterialSetupCommand
{
    Id = saved.Id,
    Title = "Updated",
    Markdown = "After"
});
```
- Async tests await the concrete call directly. There is no custom scheduler, clock fixture, or async lifetime helper.

**Error Testing:**
```text
Not detected in committed tests
```
- The current suite does not contain `Assert.Throws` or `Assert.ThrowsAsync` usage.
- Failure-path coverage is currently thinner than success-path coverage.

## Coverage Gaps

- Frontend application code under `Frontend/src/modules/**`, `Frontend/src/redux/**`, and `Frontend/src/lib/**` has no committed automated tests.
- Backend Web API endpoints under `Backend/src/ReadingTheReader.WebApi/**` have no committed request/response tests.
- Backend orchestration-heavy services such as `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/CalibrationService.cs` and `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionManager.cs` have no direct committed tests.
- Hardware-facing code in `Backend/src/infrastructure/ReadingTheReader.TobiiEyetracker/TobiiEyeTrackerAdapter.cs` has no committed automated coverage.
- Error-path and cancellation-path assertions are underrepresented relative to happy-path persistence tests.

---

*Testing analysis: 2026-03-26*
