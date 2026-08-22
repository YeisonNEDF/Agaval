using Agaval.Inventory.Domain.Enums;

namespace Agaval.Inventory.Api.Contracts.Products;

public sealed record AdjustStockRequest(
    StockMovementType Type,
    int Quantity,
    string? Observation);
