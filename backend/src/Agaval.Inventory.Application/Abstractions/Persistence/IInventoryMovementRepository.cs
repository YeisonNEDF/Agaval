using Agaval.Inventory.Application.Common.Models;
using Agaval.Inventory.Domain.Entities;

namespace Agaval.Inventory.Application.Abstractions.Persistence;

public interface IInventoryMovementRepository
{
    Task<PagedResult<InventoryMovement>> ListAsync(
        InventoryMovementFilter filter,
        CancellationToken cancellationToken);
}
