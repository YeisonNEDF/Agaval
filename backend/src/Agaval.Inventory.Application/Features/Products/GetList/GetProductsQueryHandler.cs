using Agaval.Inventory.Application.Abstractions.Persistence;
using Agaval.Inventory.Application.Common.Models;
using MediatR;

namespace Agaval.Inventory.Application.Features.Products.GetList;

public sealed class GetProductsQueryHandler(IProductRepository productRepository)
    : IRequestHandler<GetProductsQuery, IReadOnlyList<ProductDto>>
{
    public async Task<IReadOnlyList<ProductDto>> Handle(
        GetProductsQuery request,
        CancellationToken cancellationToken)
    {
        var products = await productRepository
            .ListAsync(new ProductFilter(request.CategoryId, request.Stock), cancellationToken)
            .ConfigureAwait(false);

        return products.Select(product => ProductDto.FromEntity(product)).ToArray();
    }
}
