using Agaval.Inventory.Domain.Enums;

namespace Agaval.Inventory.Application.Common.Models;

public sealed record InventoryMovementFilter(
    int? ProductId = null,
    StockMovementType? Type = null,
    int PageNumber = 1,
    int PageSize = 10,
    SortDirection SortDirection = SortDirection.Descending);
