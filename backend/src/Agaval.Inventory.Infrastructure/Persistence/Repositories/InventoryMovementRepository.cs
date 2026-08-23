using Agaval.Inventory.Application.Abstractions.Persistence;
using Agaval.Inventory.Application.Common.Models;
using Agaval.Inventory.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Agaval.Inventory.Infrastructure.Persistence.Repositories;

internal sealed class InventoryMovementRepository(PersistenceContext context)
    : IInventoryMovementRepository
{
    public async Task<PagedResult<InventoryMovement>> ListAsync(
        InventoryMovementFilter filter,
        CancellationToken cancellationToken)
    {
        IQueryable<InventoryMovement> query = context.InventoryMovements
            .AsNoTracking()
            .Include(movement => movement.Product);

        if (filter.ProductId.HasValue)
        {
            query = query.Where(movement => movement.ProductId == filter.ProductId.Value);
        }

        if (filter.Type.HasValue)
        {
            query = query.Where(movement => movement.Type == filter.Type.Value);
        }

        var totalCount = await query.CountAsync(cancellationToken).ConfigureAwait(false);
        query = filter.SortDirection == SortDirection.Ascending
            ? query.OrderBy(movement => movement.OccurredAt).ThenBy(movement => movement.Id)
            : query.OrderByDescending(movement => movement.OccurredAt)
                .ThenByDescending(movement => movement.Id);

        var movements = await query
            .Skip((filter.PageNumber - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        return new PagedResult<InventoryMovement>(
            movements,
            filter.PageNumber,
            filter.PageSize,
            totalCount);
    }
}
