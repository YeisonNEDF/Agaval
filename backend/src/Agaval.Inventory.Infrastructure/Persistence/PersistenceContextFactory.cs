using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Agaval.Inventory.Infrastructure.Persistence;

public sealed class PersistenceContextFactory : IDesignTimeDbContextFactory<PersistenceContext>
{
    public PersistenceContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__Database")
            ?? "Server=localhost,1433;Database=GestorInventarioDB;User Id=sa;" +
            "Password=Agaval_local_2026!;Encrypt=True;TrustServerCertificate=True";

        var options = new DbContextOptionsBuilder<PersistenceContext>()
            .UseSqlServer(
                connectionString,
                sqlServer => sqlServer.MigrationsAssembly(typeof(PersistenceContext).Assembly.FullName))
            .Options;

        return new PersistenceContext(options);
    }
}
