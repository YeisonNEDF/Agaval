using Agaval.Inventory.Domain.Entities;

namespace Agaval.Inventory.Application.Abstractions.Persistence;

public interface ICategoryRepository
{
    Task<Category?> GetActiveByIdAsync(int id, CancellationToken cancellationToken);

    Task<Category?> GetByIdAsync(int id, bool trackChanges, CancellationToken cancellationToken);

    Task<IReadOnlyList<Category>> ListActiveAsync(CancellationToken cancellationToken);

    Task<IReadOnlyList<Category>> ListAsync(bool includeInactive, CancellationToken cancellationToken);

    Task<bool> NameExistsAsync(string name, int? excludedId, CancellationToken cancellationToken);

    Task<bool> IsInUseAsync(int id, CancellationToken cancellationToken);

    void Add(Category category);

    void Remove(Category category);
}
