using System.Text.Json.Serialization;
using Agaval.Inventory.Api.Infrastructure;
using Agaval.Inventory.Application;
using Agaval.Inventory.Infrastructure;
using Microsoft.OpenApi;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

builder.Services
    .AddControllers()
    .AddJsonOptions(options =>
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
    options.SwaggerDoc(
        "v1",
        new OpenApiInfo
        {
            Title = "AGAVAL - Gestor de Inventario API",
            Version = "v1",
            Description = "API REST para productos, categorías y movimientos de stock.",
        }));

builder.Services.AddHealthChecks();
builder.Services.AddCors(options =>
    options.AddPolicy(
        CorsPolicies.Frontend,
        policy =>
        {
            var allowedOrigins = builder.Configuration
                .GetSection("Cors:AllowedOrigins")
                .Get<string[]>() ?? [];

            policy.WithOrigins(allowedOrigins)
                .AllowAnyHeader()
                .AllowAnyMethod();
        }));

var app = builder.Build();

app.UseExceptionHandler();
app.UseStatusCodePages();
app.UseCors(CorsPolicies.Frontend);

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "AGAVAL Inventory API v1");
        options.RoutePrefix = "swagger";
        options.DisplayRequestDuration();
    });
}

await app.ApplyPendingMigrationsAsync();

app.MapControllers();
app.MapHealthChecks("/health");

await app.RunAsync();

public partial class Program;
