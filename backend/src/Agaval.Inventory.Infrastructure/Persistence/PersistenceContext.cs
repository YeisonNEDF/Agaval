using Agaval.Inventory.Application.Abstractions.Persistence;
using Agaval.Inventory.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Agaval.Inventory.Infrastructure.Persistence;

public sealed class PersistenceContext(DbContextOptions<PersistenceContext> options)
    : DbContext(options), IUnitOfWork
{
    public DbSet<Category> Categories => Set<Category>();

    public DbSet<Product> Products => Set<Product>();

    public DbSet<InventoryMovement> InventoryMovements => Set<InventoryMovement>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(PersistenceContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
