using MediatR;

namespace Agaval.Inventory.Application.Features.Products.GetLowStock;

public sealed record GetLowStockProductsQuery : IRequest<IReadOnlyList<ProductDto>>;
