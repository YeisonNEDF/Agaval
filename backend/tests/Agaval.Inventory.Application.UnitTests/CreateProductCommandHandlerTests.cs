using Agaval.Inventory.Application.Abstractions.Persistence;
using Agaval.Inventory.Application.Common.Exceptions;
using Agaval.Inventory.Application.Common.Models;
using Agaval.Inventory.Application.Features.Products.Create;
using Agaval.Inventory.Domain.Entities;

namespace Agaval.Inventory.Application.UnitTests;

public sealed class CreateProductCommandHandlerTests
{
    private static readonly DateTimeOffset Now = new(2026, 8, 22, 15, 0, 0, TimeSpan.Zero);

    [Fact]
    public async Task HandleCreatesAndPersistsProductWithActiveCategory()
    {
        var productRepository = new ProductRepositoryStub();
        var categoryRepository = new CategoryRepositoryStub(new Category(1, "Electrónica"));
        var unitOfWork = new UnitOfWorkStub();
        var handler = new CreateProductCommandHandler(
            productRepository,
            categoryRepository,
            unitOfWork,
            new FixedTimeProvider(Now));

        var result = await handler.Handle(
            new CreateProductCommand("Monitor", "IPS", 899_900m, 2, 4, 1),
            CancellationToken.None);

        Assert.NotNull(productRepository.AddedProduct);
        Assert.Equal("Monitor", result.Name);
        Assert.Equal("Electrónica", result.CategoryName);
        Assert.True(result.IsLowStock);
        Assert.Equal(Now, result.CreatedAt);
        Assert.Equal(1, unitOfWork.SaveCallCount);
    }

    [Fact]
    public async Task HandleThrowsAndDoesNotPersistWithUnknownCategory()
    {
        var productRepository = new ProductRepositoryStub();
        var unitOfWork = new UnitOfWorkStub();
        var handler = new CreateProductCommandHandler(
            productRepository,
            new CategoryRepositoryStub(category: null),
            unitOfWork,
            new FixedTimeProvider(Now));

        var exception = await Assert.ThrowsAsync<NotFoundException>(() => handler.Handle(
            new CreateProductCommand("Monitor", null, 899_900m, 2, 4, 99),
            CancellationToken.None));

        Assert.Contains("99", exception.Message, StringComparison.Ordinal);
        Assert.Null(productRepository.AddedProduct);
        Assert.Equal(0, unitOfWork.SaveCallCount);
    }

    private sealed class FixedTimeProvider(DateTimeOffset utcNow) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => utcNow;
    }

    private sealed class UnitOfWorkStub : IUnitOfWork
    {
        public int SaveCallCount { get; private set; }

        public Task<int> SaveChangesAsync(CancellationToken cancellationToken)
        {
            SaveCallCount++;
            return Task.FromResult(1);
        }
    }

    private sealed class CategoryRepositoryStub(Category? category) : ICategoryRepository
    {
        public Task<Category?> GetActiveByIdAsync(int id, CancellationToken cancellationToken) =>
            Task.FromResult(category?.Id == id ? category : null);

        public Task<Category?> GetByIdAsync(
            int id,
            bool trackChanges,
            CancellationToken cancellationToken) =>
            Task.FromResult(category?.Id == id ? category : null);

        public Task<IReadOnlyList<Category>> ListActiveAsync(CancellationToken cancellationToken) =>
            Task.FromResult<IReadOnlyList<Category>>(category is null ? [] : [category]);

        public Task<IReadOnlyList<Category>> ListAsync(
            bool includeInactive,
            CancellationToken cancellationToken) =>
            ListActiveAsync(cancellationToken);

        public Task<bool> NameExistsAsync(
            string name,
            int? excludedId,
            CancellationToken cancellationToken) => Task.FromResult(false);

        public Task<bool> IsInUseAsync(int id, CancellationToken cancellationToken) =>
            Task.FromResult(false);

        public void Add(Category categoryToAdd)
        {
        }

        public void Remove(Category categoryToRemove)
        {
        }
    }

    private sealed class ProductRepositoryStub : IProductRepository
    {
        public Product? AddedProduct { get; private set; }

        public Task<Product?> GetByIdAsync(
            int id,
            bool trackChanges,
            CancellationToken cancellationToken) => Task.FromResult<Product?>(null);

        public Task<PagedResult<Product>> ListAsync(
            ProductFilter filter,
            CancellationToken cancellationToken) =>
            Task.FromResult(new PagedResult<Product>([], 1, 10, 0));

        public Task<InventorySummary> GetSummaryAsync(CancellationToken cancellationToken) =>
            Task.FromResult(new InventorySummary(0, 0, 0));

        public void Add(Product product) => AddedProduct = product;

        public void Remove(Product product)
        {
        }
    }
}
