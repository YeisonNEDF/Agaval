using Agaval.Inventory.Application.Abstractions.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Agaval.Inventory.Api.FunctionalTests;

internal sealed class InventoryApiFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting(
            "ConnectionStrings:Database",
            "Server=localhost;Database=AgavalFunctionalTests;Integrated Security=true;");
        builder.UseSetting("Database:ApplyMigrationsOnStartup", "false");
        builder.UseSetting("Authentication:Issuer", "Agaval.FunctionalTests");
        builder.UseSetting("Authentication:Audience", "Agaval.FunctionalTests.Client");
        builder.UseSetting("Authentication:SigningKey", "Agaval-functional-tests-signing-key-2026");
        builder.UseSetting("Authentication:Username", "test-manager");
        builder.UseSetting("Authentication:Password", "Test_password_2026!");
        builder.UseSetting("Authentication:Role", "InventoryManager");
        builder.UseSetting("Authentication:TokenLifetimeMinutes", "10");

        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IProductRepository>();
            services.RemoveAll<ICategoryRepository>();
            services.RemoveAll<IInventoryMovementRepository>();
            services.RemoveAll<IUnitOfWork>();

            services.AddSingleton<InventoryTestStore>();
            services.AddSingleton<IProductRepository>(provider =>
                provider.GetRequiredService<InventoryTestStore>());
            services.AddSingleton<ICategoryRepository>(provider =>
                provider.GetRequiredService<InventoryTestStore>());
            services.AddSingleton<IInventoryMovementRepository>(provider =>
                provider.GetRequiredService<InventoryTestStore>());
            services.AddSingleton<IUnitOfWork>(provider =>
                provider.GetRequiredService<InventoryTestStore>());
        });
    }
}
