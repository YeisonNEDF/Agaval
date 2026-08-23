using Agaval.Inventory.Application.Common.Models;
using Agaval.Inventory.Domain.Enums;
using MediatR;

namespace Agaval.Inventory.Application.Features.InventoryMovements.GetList;

public sealed record GetInventoryMovementsQuery(
    int? ProductId,
    StockMovementType? Type,
    int PageNumber,
    int PageSize,
    SortDirection SortDirection) : IRequest<PagedResult<InventoryMovementDto>>;
