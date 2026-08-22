using MediatR;

namespace Agaval.Inventory.Application.Features.Products.Create;

public sealed record CreateProductCommand(
    string Name,
    string? Description,
    decimal Price,
    int Stock,
    int MinimumStock,
    int CategoryId) : IRequest<ProductDto>;
