using FastEndpoints;
using FastEndpoints.Swagger;
using ReadingTheReader.core.Application;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
using ReadingTheReader.Realtime.Persistence;
using ReadingTheReader.TobiiEyetracker;
using ReadingTheReader.WebApi;
using ReadingTheReader.WebApi.Websockets;

var builder = WebApplication.CreateBuilder(args);
const string LocalhostCorsPolicy = "LocalhostCorsPolicy";
var calibrationOptions = builder.Configuration.GetSection(CalibrationOptions.SectionName).Get<CalibrationOptions>()
    ?? new CalibrationOptions();

// Modules installation
builder.Services.InstallTobiiEyeTrackerModule();
builder.Services.InstallApplicationModule(calibrationOptions);
builder.Services.InstallRealtimePersistenceModule(builder.Configuration);

builder.Services.AddWebSocketServices();
builder.Services.AddAuthentication();
builder.Services.AddAuthorization();
builder.Services.AddCors(options =>
{
    options.AddPolicy(LocalhostCorsPolicy, policy =>
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

app.UseCors(LocalhostCorsPolicy);
app.UseFastEndpoints(c =>
{
    c.Endpoints.RoutePrefix = "api";
}).UseSwaggerGen();

app.UseAuthentication();
app.UseAuthorization();
app.ConfigureWebSockets();

app.Run();
