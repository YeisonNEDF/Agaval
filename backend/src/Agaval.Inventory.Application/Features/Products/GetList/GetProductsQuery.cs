using Agaval.Inventory.Application.Common.Models;
using MediatR;

namespace Agaval.Inventory.Application.Features.Products.GetList;

public sealed record GetProductsQuery(int? CategoryId, StockFilter Stock)
    : IRequest<IReadOnlyList<ProductDto>>;
