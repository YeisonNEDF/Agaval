using Agaval.Inventory.Application.Abstractions.Persistence;
using Agaval.Inventory.Application.Common.Exceptions;
using MediatR;

namespace Agaval.Inventory.Application.Features.Products.AdjustStock;

public sealed class AdjustProductStockCommandHandler(
    IProductRepository productRepository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<AdjustProductStockCommand, ProductDto>
{
    public async Task<ProductDto> Handle(
        AdjustProductStockCommand request,
        CancellationToken cancellationToken)
    {
        var product = await productRepository
            .GetByIdAsync(request.ProductId, trackChanges: true, cancellationToken)
            .ConfigureAwait(false)
            ?? throw new NotFoundException("el producto", request.ProductId);

        product.AdjustStock(request.Type, request.Quantity, request.Observation, timeProvider.GetUtcNow());
        await unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return ProductDto.FromEntity(product);
    }
}
