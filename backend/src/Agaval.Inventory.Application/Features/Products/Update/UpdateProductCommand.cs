using MediatR;

namespace Agaval.Inventory.Application.Features.Products.Update;

public sealed record UpdateProductCommand(
    int Id,
    string Name,
    string? Description,
    decimal Price,
    int Stock,
    int MinimumStock,
    int CategoryId) : IRequest<ProductDto>;
