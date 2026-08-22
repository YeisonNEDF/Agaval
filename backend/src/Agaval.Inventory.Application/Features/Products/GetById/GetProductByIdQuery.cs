using MediatR;

namespace Agaval.Inventory.Application.Features.Products.GetById;

public sealed record GetProductByIdQuery(int Id) : IRequest<ProductDto>;
