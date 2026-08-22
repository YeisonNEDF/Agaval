using System.Reflection;
using Agaval.Inventory.Application.Abstractions.Persistence;
using Agaval.Inventory.Application.Common.Models;
using Agaval.Inventory.Domain.Entities;

namespace Agaval.Inventory.Api.FunctionalTests;

internal sealed class InventoryTestStore : IProductRepository, ICategoryRepository, IUnitOfWork
{
    private static readonly PropertyInfo ProductIdProperty =
        typeof(Product).GetProperty(nameof(Product.Id))
        ?? throw new InvalidOperationException("No se encontró Product.Id.");

    private static readonly PropertyInfo ProductCategoryProperty =
        typeof(Product).GetProperty(nameof(Product.Category))
        ?? throw new InvalidOperationException("No se encontró Product.Category.");

    private readonly IReadOnlyDictionary<int, Category> categories = new Dictionary<int, Category>
    {
        [1] = new Category(1, "Electrónica"),
        [2] = new Category(2, "Oficina"),
    };

    private readonly Dictionary<int, Product> products = [];
    private int nextProductId = 100;

    public Task<Product?> GetByIdAsync(
        int id,
        bool trackChanges,
        CancellationToken cancellationToken)
    {
        products.TryGetValue(id, out var product);
        SetCategory(product);
        return Task.FromResult(product);
    }

    public Task<IReadOnlyList<Product>> ListAsync(
        ProductFilter filter,
        CancellationToken cancellationToken)
    {
        var result = products.Values
            .Where(product => filter.CategoryId is null || product.CategoryId == filter.CategoryId)
            .Where(product => filter.Stock switch
            {
                StockFilter.Low => product.IsLowStock,
                StockFilter.Normal => !product.IsLowStock,
                _ => true,
            })
            .OrderBy(product => product.Name)
            .ToArray();

        foreach (var product in result)
        {
            SetCategory(product);
        }

        return Task.FromResult<IReadOnlyList<Product>>(result);
    }

    public void Add(Product product)
    {
        ProductIdProperty.SetValue(product, nextProductId++);
        SetCategory(product);
        products.Add(product.Id, product);
    }

    public void Remove(Product product) => products.Remove(product.Id);

    public Task<Category?> GetActiveByIdAsync(int id, CancellationToken cancellationToken)
    {
        categories.TryGetValue(id, out var category);
        return Task.FromResult(category?.IsActive is true ? category : null);
    }

    public Task<IReadOnlyList<Category>> ListActiveAsync(CancellationToken cancellationToken) =>
        Task.FromResult<IReadOnlyList<Category>>(
            categories.Values.Where(category => category.IsActive).ToArray());

    public Task<int> SaveChangesAsync(CancellationToken cancellationToken) => Task.FromResult(1);

    private void SetCategory(Product? product)
    {
        if (product is not null && categories.TryGetValue(product.CategoryId, out var category))
        {
            ProductCategoryProperty.SetValue(product, category);
        }
    }
}
