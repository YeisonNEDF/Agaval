using Agaval.Inventory.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Agaval.Inventory.Api.Infrastructure;

internal static class DatabaseInitializationExtensions
{
    public static async Task ApplyPendingMigrationsAsync(this WebApplication app)
    {
        if (!app.Configuration.GetValue<bool>("Database:ApplyMigrationsOnStartup"))
        {
            return;
        }

        await using var scope = app.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<PersistenceContext>();
        await context.Database.MigrateAsync().ConfigureAwait(false);
    }
}
