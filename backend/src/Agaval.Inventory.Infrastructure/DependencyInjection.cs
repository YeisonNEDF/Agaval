using Agaval.Inventory.Application.Abstractions.Authentication;
using Agaval.Inventory.Application.Abstractions.Persistence;
using Agaval.Inventory.Infrastructure.Authentication;
using Agaval.Inventory.Infrastructure.Persistence;
using Agaval.Inventory.Infrastructure.Persistence.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Agaval.Inventory.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var authenticationSection = configuration.GetSection(AuthenticationOptions.SectionName);
        var tokenLifetimeText = authenticationSection[nameof(AuthenticationOptions.TokenLifetimeMinutes)];
        var authenticationOptions = new AuthenticationOptions
        {
            Issuer = authenticationSection[nameof(AuthenticationOptions.Issuer)] ?? string.Empty,
            Audience = authenticationSection[nameof(AuthenticationOptions.Audience)] ?? string.Empty,
            SigningKey = authenticationSection[nameof(AuthenticationOptions.SigningKey)] ?? string.Empty,
            Username = authenticationSection[nameof(AuthenticationOptions.Username)] ?? string.Empty,
            Password = authenticationSection[nameof(AuthenticationOptions.Password)] ?? string.Empty,
            Role = authenticationSection[nameof(AuthenticationOptions.Role)] ?? "InventoryManager",
            TokenLifetimeMinutes = int.TryParse(tokenLifetimeText, out var tokenLifetimeMinutes)
                ? tokenLifetimeMinutes
                : 120,
        };
        services.AddSingleton(authenticationOptions);
        services.AddSingleton<IIdentityService, ConfiguredIdentityService>();

        var connectionString = configuration.GetConnectionString("Database");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "Configure la conexión a SQL Server en 'ConnectionStrings:Database' o en la variable " +
                "'ConnectionStrings__Database'.");
        }

        services.AddDbContext<PersistenceContext>(options =>
            options.UseSqlServer(
                connectionString,
                sqlServer =>
                {
                    sqlServer.MigrationsAssembly(typeof(PersistenceContext).Assembly.FullName);
                    sqlServer.EnableRetryOnFailure(5, TimeSpan.FromSeconds(10), errorNumbersToAdd: null);
                }));

        services.AddScoped<IProductRepository, ProductRepository>();
        services.AddScoped<ICategoryRepository, CategoryRepository>();
        services.AddScoped<IInventoryMovementRepository, InventoryMovementRepository>();
        services.AddScoped<IUnitOfWork>(provider => provider.GetRequiredService<PersistenceContext>());

        return services;
    }
}
