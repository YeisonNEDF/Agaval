using Agaval.Inventory.Application.Abstractions.Persistence;
using Agaval.Inventory.Application.Common.Models;
using MediatR;

namespace Agaval.Inventory.Application.Features.Products.GetLowStock;

public sealed class GetLowStockProductsQueryHandler(IProductRepository productRepository)
    : IRequestHandler<GetLowStockProductsQuery, IReadOnlyList<ProductDto>>
{
    public async Task<IReadOnlyList<ProductDto>> Handle(
        GetLowStockProductsQuery request,
        CancellationToken cancellationToken)
    {
        var products = await productRepository
            .ListAsync(new ProductFilter(Stock: StockFilter.Low), cancellationToken)
            .ConfigureAwait(false);

        return products.Select(product => ProductDto.FromEntity(product)).ToArray();
    }
}
