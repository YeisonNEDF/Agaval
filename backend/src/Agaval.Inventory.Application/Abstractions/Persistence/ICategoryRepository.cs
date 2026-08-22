using Agaval.Inventory.Domain.Entities;

namespace Agaval.Inventory.Application.Abstractions.Persistence;

public interface ICategoryRepository
{
    Task<Category?> GetActiveByIdAsync(int id, CancellationToken cancellationToken);

    Task<IReadOnlyList<Category>> ListActiveAsync(CancellationToken cancellationToken);
}
