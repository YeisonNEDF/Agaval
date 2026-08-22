using Agaval.Inventory.Application.Abstractions.Persistence;
using Agaval.Inventory.Application.Common.Exceptions;
using MediatR;

namespace Agaval.Inventory.Application.Features.Products.Update;

public sealed class UpdateProductCommandHandler(
    IProductRepository productRepository,
    ICategoryRepository categoryRepository,
    IUnitOfWork unitOfWork) : IRequestHandler<UpdateProductCommand, ProductDto>
{
    public async Task<ProductDto> Handle(
        UpdateProductCommand request,
        CancellationToken cancellationToken)
    {
        var product = await productRepository
            .GetByIdAsync(request.Id, trackChanges: true, cancellationToken)
            .ConfigureAwait(false)
            ?? throw new NotFoundException("el producto", request.Id);

        var category = await categoryRepository
            .GetActiveByIdAsync(request.CategoryId, cancellationToken)
            .ConfigureAwait(false)
            ?? throw new NotFoundException("la categoría activa", request.CategoryId);

        product.UpdateDetails(
            request.Name,
            request.Description,
            request.Price,
            request.Stock,
            request.MinimumStock,
            request.CategoryId);

        await unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return ProductDto.FromEntity(product, category.Name);
    }
}
