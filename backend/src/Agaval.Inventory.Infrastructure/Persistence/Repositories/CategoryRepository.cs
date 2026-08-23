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

    public Task<Category?> GetByIdAsync(
        int id,
        bool trackChanges,
        CancellationToken cancellationToken)
    {
        IQueryable<Category> query = context.Categories;
        query = trackChanges ? query.AsTracking() : query.AsNoTracking();
        return query.SingleOrDefaultAsync(category => category.Id == id, cancellationToken);
    }

    public async Task<IReadOnlyList<Category>> ListActiveAsync(CancellationToken cancellationToken) =>
        await context.Categories
            .AsNoTracking()
            .Where(category => category.IsActive)
            .OrderBy(category => category.Name)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

    public async Task<IReadOnlyList<Category>> ListAsync(
        bool includeInactive,
        CancellationToken cancellationToken)
    {
        IQueryable<Category> query = context.Categories.AsNoTracking();
        if (!includeInactive)
        {
            query = query.Where(category => category.IsActive);
        }

        return await query
            .OrderByDescending(category => category.IsActive)
            .ThenBy(category => category.Name)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
    }

    public Task<bool> NameExistsAsync(
        string name,
        int? excludedId,
        CancellationToken cancellationToken) =>
        context.Categories.AnyAsync(
            category => category.Name == name &&
                (!excludedId.HasValue || category.Id != excludedId.Value),
            cancellationToken);

    public void Add(Category category) => context.Categories.Add(category);
}
