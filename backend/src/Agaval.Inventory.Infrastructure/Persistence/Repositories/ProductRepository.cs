using Agaval.Inventory.Application.Abstractions.Persistence;
using Agaval.Inventory.Application.Common.Models;
using Agaval.Inventory.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Agaval.Inventory.Infrastructure.Persistence.Repositories;

internal sealed class ProductRepository(PersistenceContext context) : IProductRepository
{
    public Task<Product?> GetByIdAsync(
        int id,
        bool trackChanges,
        CancellationToken cancellationToken)
    {
        IQueryable<Product> query = context.Products.Include(product => product.Category);
        query = trackChanges ? query.AsTracking() : query.AsNoTracking();

        return query.SingleOrDefaultAsync(product => product.Id == id, cancellationToken);
    }

    public async Task<IReadOnlyList<Product>> ListAsync(
        ProductFilter filter,
        CancellationToken cancellationToken)
    {
        IQueryable<Product> query = context.Products
            .AsNoTracking()
            .Include(product => product.Category);

        if (filter.CategoryId.HasValue)
        {
            query = query.Where(product => product.CategoryId == filter.CategoryId.Value);
        }

        query = filter.Stock switch
        {
            StockFilter.Low => query.Where(product => product.Stock < product.MinimumStock),
            StockFilter.Normal => query.Where(product => product.Stock >= product.MinimumStock),
            _ => query,
        };

        return await query
            .OrderBy(product => product.Name)
            .ThenBy(product => product.Id)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
    }

    public void Add(Product product) => context.Products.Add(product);

    public void Remove(Product product) => context.Products.Remove(product);
}
