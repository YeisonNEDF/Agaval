using Agaval.Inventory.Application.Abstractions.Persistence;
using Agaval.Inventory.Application.Common.Exceptions;
using MediatR;

namespace Agaval.Inventory.Application.Features.Products.GetById;

public sealed class GetProductByIdQueryHandler(IProductRepository productRepository)
    : IRequestHandler<GetProductByIdQuery, ProductDto>
{
    public async Task<ProductDto> Handle(
        GetProductByIdQuery request,
        CancellationToken cancellationToken)
    {
        var product = await productRepository
            .GetByIdAsync(request.Id, trackChanges: false, cancellationToken)
            .ConfigureAwait(false)
            ?? throw new NotFoundException("el producto", request.Id);

        return ProductDto.FromEntity(product);
    }
}
