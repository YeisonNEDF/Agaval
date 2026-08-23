using Agaval.Inventory.Application.Abstractions.Persistence;
using Agaval.Inventory.Application.Common.Models;
using MediatR;

namespace Agaval.Inventory.Application.Features.InventoryMovements.GetList;

public sealed class GetInventoryMovementsQueryHandler(
    IInventoryMovementRepository movementRepository)
    : IRequestHandler<GetInventoryMovementsQuery, PagedResult<InventoryMovementDto>>
{
    public async Task<PagedResult<InventoryMovementDto>> Handle(
        GetInventoryMovementsQuery request,
        CancellationToken cancellationToken)
    {
        var movements = await movementRepository
            .ListAsync(
                new InventoryMovementFilter(
                    request.ProductId,
                    request.Type,
                    request.PageNumber,
                    request.PageSize,
                    request.SortDirection),
                cancellationToken)
            .ConfigureAwait(false);

        return movements.Map(InventoryMovementDto.FromEntity);
    }
}
