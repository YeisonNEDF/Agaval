using Agaval.Inventory.Application.Abstractions.Persistence;
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
        var connectionString = configuration.GetConnectionString("Database");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "Configure la conexión a Supabase en 'ConnectionStrings:Database' o en la variable " +
                "'ConnectionStrings__Database'.");
        }

        services.AddDbContext<PersistenceContext>(options =>
            options.UseNpgsql(
                connectionString,
                npgsql =>
                {
                    npgsql.MigrationsAssembly(typeof(PersistenceContext).Assembly.FullName);
                    npgsql.EnableRetryOnFailure(5, TimeSpan.FromSeconds(10), errorCodesToAdd: null);
                }));

        services.AddScoped<IProductRepository, ProductRepository>();
        services.AddScoped<ICategoryRepository, CategoryRepository>();
        services.AddScoped<IUnitOfWork>(provider => provider.GetRequiredService<PersistenceContext>());

        return services;
    }
}
