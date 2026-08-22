using System.ComponentModel.DataAnnotations;
using Agaval.Inventory.Domain.Enums;

namespace Agaval.Inventory.Api.Contracts.Products;

public sealed record AdjustStockRequest(
    StockMovementType Type,
    [property: Range(1, int.MaxValue)] int Quantity,
    [property: MaxLength(255)] string? Observation);
