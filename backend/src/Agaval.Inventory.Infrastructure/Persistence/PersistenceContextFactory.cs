using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Agaval.Inventory.Infrastructure.Persistence;

public sealed class PersistenceContextFactory : IDesignTimeDbContextFactory<PersistenceContext>
{
    public PersistenceContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__Database")
            ?? "Host=localhost;Port=5432;Database=postgres;Username=postgres;Password=postgres";

        var options = new DbContextOptionsBuilder<PersistenceContext>()
            .UseNpgsql(
                connectionString,
                npgsql => npgsql.MigrationsAssembly(typeof(PersistenceContext).Assembly.FullName))
            .Options;

        return new PersistenceContext(options);
    }
}
