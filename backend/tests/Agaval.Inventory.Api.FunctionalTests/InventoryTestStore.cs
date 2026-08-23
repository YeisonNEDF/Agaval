using System.Reflection;
using Agaval.Inventory.Application.Abstractions.Persistence;
using Agaval.Inventory.Application.Common.Models;
using Agaval.Inventory.Domain.Entities;

namespace Agaval.Inventory.Api.FunctionalTests;

internal sealed class InventoryTestStore :
    IProductRepository,
    ICategoryRepository,
    IInventoryMovementRepository,
    IUnitOfWork
{
    private static readonly PropertyInfo ProductIdProperty = GetProperty<Product>(nameof(Product.Id));
    private static readonly PropertyInfo ProductCategoryProperty =
        GetProperty<Product>(nameof(Product.Category));
    private static readonly PropertyInfo CategoryIdProperty = GetProperty<Category>(nameof(Category.Id));
    private static readonly PropertyInfo MovementIdProperty =
        GetProperty<InventoryMovement>(nameof(InventoryMovement.Id));
    private static readonly PropertyInfo MovementProductProperty =
        GetProperty<InventoryMovement>(nameof(InventoryMovement.Product));

    private readonly Dictionary<int, Category> categories = new()
    {
        [1] = new Category(1, "Electrónica"),
        [2] = new Category(2, "Oficina"),
    };
    private readonly Dictionary<int, Product> products = [];
    private int nextProductId = 100;
    private int nextCategoryId = 10;
    private int nextMovementId = 1;

    public Task<Product?> GetByIdAsync(
        int id,
        bool trackChanges,
        CancellationToken cancellationToken)
    {
        products.TryGetValue(id, out var product);
        SetCategory(product);
        return Task.FromResult(product);
    }

    public Task<PagedResult<Product>> ListAsync(
        ProductFilter filter,
        CancellationToken cancellationToken)
    {
        IEnumerable<Product> query = products.Values
            .Where(product => filter.CategoryId is null || product.CategoryId == filter.CategoryId)
            .Where(product => filter.Stock switch
            {
                StockFilter.Low => product.IsLowStock,
                StockFilter.Normal => !product.IsLowStock,
                _ => true,
            });

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            query = query.Where(product =>
                product.Name.Contains(filter.Search, StringComparison.OrdinalIgnoreCase) ||
                (product.Description?.Contains(filter.Search, StringComparison.OrdinalIgnoreCase) ?? false));
        }

        var filteredProducts = ApplyOrdering(query, filter.SortBy, filter.SortDirection).ToArray();
        foreach (var product in filteredProducts)
        {
            SetCategory(product);
        }

        var page = filteredProducts
            .Skip((filter.PageNumber - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .ToArray();

        return Task.FromResult(
            new PagedResult<Product>(page, filter.PageNumber, filter.PageSize, filteredProducts.Length));
    }

    public Task<InventorySummary> GetSummaryAsync(CancellationToken cancellationToken) =>
        Task.FromResult(
            new InventorySummary(
                products.Count,
                products.Values.Count(product => product.IsLowStock),
                products.Values.Sum(product => product.Price * product.Stock)));

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

    Task<Category?> ICategoryRepository.GetByIdAsync(
        int id,
        bool trackChanges,
        CancellationToken cancellationToken)
    {
        categories.TryGetValue(id, out var category);
        return Task.FromResult(category);
    }

    public Task<IReadOnlyList<Category>> ListActiveAsync(CancellationToken cancellationToken) =>
        Task.FromResult<IReadOnlyList<Category>>(
            categories.Values.Where(category => category.IsActive).OrderBy(category => category.Name).ToArray());

    public Task<IReadOnlyList<Category>> ListAsync(
        bool includeInactive,
        CancellationToken cancellationToken) =>
        Task.FromResult<IReadOnlyList<Category>>(
            categories.Values
                .Where(category => includeInactive || category.IsActive)
                .OrderByDescending(category => category.IsActive)
                .ThenBy(category => category.Name)
                .ToArray());

    public Task<bool> NameExistsAsync(
        string name,
        int? excludedId,
        CancellationToken cancellationToken) =>
        Task.FromResult(
            categories.Values.Any(category =>
                category.Id != excludedId &&
                string.Equals(category.Name, name, StringComparison.OrdinalIgnoreCase)));

    public void Add(Category category)
    {
        CategoryIdProperty.SetValue(category, nextCategoryId++);
        categories.Add(category.Id, category);
    }

    public Task<PagedResult<InventoryMovement>> ListAsync(
        InventoryMovementFilter filter,
        CancellationToken cancellationToken)
    {
        var movements = products.Values
            .SelectMany(product => product.Movements.Select(movement => (Product: product, Movement: movement)))
            .Where(item => filter.ProductId is null || item.Movement.ProductId == filter.ProductId)
            .Where(item => filter.Type is null || item.Movement.Type == filter.Type)
            .ToArray();

        foreach (var item in movements)
        {
            MovementProductProperty.SetValue(item.Movement, item.Product);
        }

        var orderedMovements = filter.SortDirection == SortDirection.Ascending
            ? movements.OrderBy(item => item.Movement.OccurredAt).Select(item => item.Movement).ToArray()
            : movements.OrderByDescending(item => item.Movement.OccurredAt)
                .Select(item => item.Movement)
                .ToArray();
        var page = orderedMovements
            .Skip((filter.PageNumber - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .ToArray();

        return Task.FromResult(
            new PagedResult<InventoryMovement>(
                page,
                filter.PageNumber,
                filter.PageSize,
                orderedMovements.Length));
    }

    public Task<int> SaveChangesAsync(CancellationToken cancellationToken)
    {
        foreach (var movement in products.Values.SelectMany(product => product.Movements))
        {
            if (movement.Id == 0)
            {
                MovementIdProperty.SetValue(movement, nextMovementId++);
            }
        }

        return Task.FromResult(1);
    }

    private static IOrderedEnumerable<Product> ApplyOrdering(
        IEnumerable<Product> productsToOrder,
        ProductSortField sortBy,
        SortDirection direction) =>
        (sortBy, direction) switch
        {
            (ProductSortField.Price, SortDirection.Ascending) =>
                productsToOrder.OrderBy(product => product.Price),
            (ProductSortField.Price, SortDirection.Descending) =>
                productsToOrder.OrderByDescending(product => product.Price),
            (ProductSortField.Stock, SortDirection.Ascending) =>
                productsToOrder.OrderBy(product => product.Stock),
            (ProductSortField.Stock, SortDirection.Descending) =>
                productsToOrder.OrderByDescending(product => product.Stock),
            (ProductSortField.CreatedAt, SortDirection.Ascending) =>
                productsToOrder.OrderBy(product => product.CreatedAt),
            (ProductSortField.CreatedAt, SortDirection.Descending) =>
                productsToOrder.OrderByDescending(product => product.CreatedAt),
            (ProductSortField.Name, SortDirection.Descending) =>
                productsToOrder.OrderByDescending(product => product.Name),
            _ => productsToOrder.OrderBy(product => product.Name),
        };

    private void SetCategory(Product? product)
    {
        if (product is not null && categories.TryGetValue(product.CategoryId, out var category))
        {
            ProductCategoryProperty.SetValue(product, category);
        }
    }

    private static PropertyInfo GetProperty<TEntity>(string propertyName) =>
        typeof(TEntity).GetProperty(propertyName)
        ?? throw new InvalidOperationException($"No se encontró {typeof(TEntity).Name}.{propertyName}.");
}
