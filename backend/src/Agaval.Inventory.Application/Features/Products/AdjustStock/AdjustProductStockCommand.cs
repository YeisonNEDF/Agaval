using Agaval.Inventory.Domain.Enums;
using MediatR;

namespace Agaval.Inventory.Application.Features.Products.AdjustStock;

public sealed record AdjustProductStockCommand(
    int ProductId,
    StockMovementType Type,
    int Quantity,
    string? Observation) : IRequest<ProductDto>;
