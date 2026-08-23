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

    public async Task<PagedResult<Product>> ListAsync(
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

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var search = filter.Search.Trim();
            query = query.Where(product =>
                product.Name.Contains(search) ||
                (product.Description != null && product.Description.Contains(search)));
        }

        query = filter.Stock switch
        {
            StockFilter.Low => query.Where(product => product.Stock < product.MinimumStock),
            StockFilter.Normal => query.Where(product => product.Stock >= product.MinimumStock),
            _ => query,
        };

        var totalCount = await query.CountAsync(cancellationToken).ConfigureAwait(false);
        query = ApplyOrdering(query, filter.SortBy, filter.SortDirection);

        var products = await query
            .Skip((filter.PageNumber - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        return new PagedResult<Product>(products, filter.PageNumber, filter.PageSize, totalCount);
    }

    public void Add(Product product) => context.Products.Add(product);

    public void Remove(Product product) => context.Products.Remove(product);

    public async Task<InventorySummary> GetSummaryAsync(CancellationToken cancellationToken)
    {
        var totalProducts = await context.Products
            .AsNoTracking()
            .CountAsync(cancellationToken)
            .ConfigureAwait(false);
        var lowStockProducts = await context.Products
            .AsNoTracking()
            .CountAsync(product => product.Stock < product.MinimumStock, cancellationToken)
            .ConfigureAwait(false);
        var inventoryValue = await context.Products
            .AsNoTracking()
            .SumAsync(product => product.Price * product.Stock, cancellationToken)
            .ConfigureAwait(false);

        return new InventorySummary(totalProducts, lowStockProducts, inventoryValue);
    }

    private static IQueryable<Product> ApplyOrdering(
        IQueryable<Product> query,
        ProductSortField sortBy,
        SortDirection direction) =>
        (sortBy, direction) switch
        {
            (ProductSortField.Category, SortDirection.Ascending) => query
                .OrderBy(product => product.Category.Name)
                .ThenBy(product => product.Name)
                .ThenBy(product => product.Id),
            (ProductSortField.Category, SortDirection.Descending) => query
                .OrderByDescending(product => product.Category.Name)
                .ThenByDescending(product => product.Name)
                .ThenByDescending(product => product.Id),
            (ProductSortField.Price, SortDirection.Ascending) => query
                .OrderBy(product => product.Price)
                .ThenBy(product => product.Id),
            (ProductSortField.Price, SortDirection.Descending) => query
                .OrderByDescending(product => product.Price)
                .ThenByDescending(product => product.Id),
            (ProductSortField.Stock, SortDirection.Ascending) => query
                .OrderBy(product => product.Stock)
                .ThenBy(product => product.Id),
            (ProductSortField.Stock, SortDirection.Descending) => query
                .OrderByDescending(product => product.Stock)
                .ThenByDescending(product => product.Id),
            (ProductSortField.CreatedAt, SortDirection.Ascending) => query
                .OrderBy(product => product.CreatedAt)
                .ThenBy(product => product.Id),
            (ProductSortField.CreatedAt, SortDirection.Descending) => query
                .OrderByDescending(product => product.CreatedAt)
                .ThenByDescending(product => product.Id),
            (ProductSortField.Name, SortDirection.Descending) => query
                .OrderByDescending(product => product.Name)
                .ThenByDescending(product => product.Id),
            _ => query.OrderBy(product => product.Name).ThenBy(product => product.Id),
        };
}
