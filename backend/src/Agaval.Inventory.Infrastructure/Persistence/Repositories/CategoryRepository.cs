using Agaval.Inventory.Application.Abstractions.Persistence;
using Agaval.Inventory.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Agaval.Inventory.Infrastructure.Persistence.Repositories;

internal sealed class CategoryRepository(PersistenceContext context) : ICategoryRepository
{
    public Task<Category?> GetActiveByIdAsync(int id, CancellationToken cancellationToken) =>
        context.Categories
            .AsNoTracking()
            .SingleOrDefaultAsync(category => category.Id == id && category.IsActive, cancellationToken);

    public async Task<IReadOnlyList<Category>> ListActiveAsync(CancellationToken cancellationToken) =>
        await context.Categories
            .AsNoTracking()
            .Where(category => category.IsActive)
            .OrderBy(category => category.Name)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
}
