using Agaval.Inventory.Application.Common.Models;
using Agaval.Inventory.Domain.Entities;

namespace Agaval.Inventory.Application.Abstractions.Persistence;

public interface IProductRepository
{
    Task<Product?> GetByIdAsync(int id, bool trackChanges, CancellationToken cancellationToken);

    Task<IReadOnlyList<Product>> ListAsync(ProductFilter filter, CancellationToken cancellationToken);

    void Add(Product product);

    void Remove(Product product);
}
