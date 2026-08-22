using Agaval.Inventory.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Agaval.Inventory.Api.Infrastructure;

internal static partial class DatabaseInitializationExtensions
{
    public static async Task ApplyPendingMigrationsAsync(this WebApplication app)
    {
        if (!app.Configuration.GetValue<bool>("Database:ApplyMigrationsOnStartup"))
        {
            LogAutomaticMigrationsDisabled(app.Logger);
            return;
        }

        await using var scope = app.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<PersistenceContext>();

        var pendingMigrations = await context.Database
            .GetPendingMigrationsAsync()
            .ConfigureAwait(false);
        var migrations = pendingMigrations.ToArray();

        if (migrations.Length == 0)
        {
            LogDatabaseUpToDate(app.Logger);
            return;
        }

        LogApplyingMigrations(app.Logger, migrations.Length);

        await context.Database.MigrateAsync().ConfigureAwait(false);
        LogDatabaseUpdated(app.Logger);
    }

    [LoggerMessage(
        EventId = 2000,
        Level = LogLevel.Information,
        Message = "La aplicación automática de migraciones está deshabilitada para este ambiente.")]
    private static partial void LogAutomaticMigrationsDisabled(ILogger logger);

    [LoggerMessage(
        EventId = 2001,
        Level = LogLevel.Information,
        Message = "El esquema de SQL Server está actualizado.")]
    private static partial void LogDatabaseUpToDate(ILogger logger);

    [LoggerMessage(
        EventId = 2002,
        Level = LogLevel.Information,
        Message = "Se aplicarán {MigrationCount} migraciones pendientes.")]
    private static partial void LogApplyingMigrations(ILogger logger, int migrationCount);

    [LoggerMessage(
        EventId = 2003,
        Level = LogLevel.Information,
        Message = "La base de datos y sus datos iniciales quedaron actualizados.")]
    private static partial void LogDatabaseUpdated(ILogger logger);
}
