using Agaval.Inventory.Application.Abstractions.Persistence;
using Agaval.Inventory.Application.Common.Models;
using MediatR;

namespace Agaval.Inventory.Application.Features.Products.GetList;

public sealed class GetProductsQueryHandler(IProductRepository productRepository)
    : IRequestHandler<GetProductsQuery, PagedResult<ProductDto>>
{
    public async Task<PagedResult<ProductDto>> Handle(
        GetProductsQuery request,
        CancellationToken cancellationToken)
    {
        var products = await productRepository
            .ListAsync(
                new ProductFilter(
                    request.CategoryId,
                    request.Stock,
                    request.Search,
                    request.PageNumber,
                    request.PageSize,
                    request.SortBy,
                    request.SortDirection),
                cancellationToken)
            .ConfigureAwait(false);

        return products.Map(product => ProductDto.FromEntity(product));
    }
}
