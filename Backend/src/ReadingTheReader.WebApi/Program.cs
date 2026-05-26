using FastEndpoints;
using FastEndpoints.Swagger;
using ReadingTheReader.core.Application;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Modules;
using ReadingTheReader.Realtime.Persistence;
using ReadingTheReader.TobiiEyetracker;
using ReadingTheReader.WebApi.OpenCv;
using ReadingTheReader.WebApi.Websockets;

var builder = WebApplication.CreateBuilder(args);
const string localhostCorsPolicy = "LocalhostCorsPolicy";
var calibrationOptions = builder.Configuration.GetSection(CalibrationOptions.SectionName).Get<CalibrationOptions>()
    ?? new CalibrationOptions();
var experimentSetupTestingOptions = builder.Configuration.GetSection(ExperimentSetupTestingOptions.SectionName).Get<ExperimentSetupTestingOptions>()
    ?? new ExperimentSetupTestingOptions();
var moduleProviderOptions = builder.Configuration.GetSection(ModuleProviderOptions.SectionName).Get<ModuleProviderOptions>()
    ?? new ModuleProviderOptions();
builder.Services.Configure<OpenCvWebcamSensingOptions>(
    builder.Configuration.GetSection(OpenCvWebcamSensingOptions.SectionName));

// Modules installation
builder.Services.InstallTobiiEyeTrackerModule();
builder.Services.InstallApplicationModule(
    calibrationOptions,
    experimentSetupTestingOptions);
builder.Services.InstallModuleProviderFramework(moduleProviderOptions);
builder.Services.InstallRealtimePersistenceModule(builder.Configuration);

builder.Services.AddWebSocketServices();
builder.Services.InstallWebcamModule();
builder.Services.AddAuthentication();
builder.Services.AddAuthorization();
builder.Services.AddCors(options =>
{
    options.AddPolicy(localhostCorsPolicy, policy =>
    {
        policy
            .SetIsOriginAllowed(origin =>
                Uri.TryCreate(origin, UriKind.Absolute, out var uri) &&
                (uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase) ||
                 uri.Host.Equals("127.0.0.1")))
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.AddFastEndpoints().SwaggerDocument();
builder.Services.AddEndpointsApiExplorer();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.Use(async (context, next) =>
{
    if (!context.WebSockets.IsWebSocketRequest)
    {
        Console.WriteLine($"REST request received. Method={context.Request.Method}, Path={context.Request.Path}");
    }

    await next();
});

app.UseCors(localhostCorsPolicy);
app.UseFastEndpoints(c =>
{
    c.Endpoints.RoutePrefix = "api";
}).UseSwaggerGen();

app.UseAuthentication();
app.UseAuthorization();
app.ConfigureWebSockets();

app.Run();
