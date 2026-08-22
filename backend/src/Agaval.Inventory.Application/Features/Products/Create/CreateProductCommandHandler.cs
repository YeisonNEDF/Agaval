using Agaval.Inventory.Application.Abstractions.Persistence;
using Agaval.Inventory.Application.Common.Exceptions;
using Agaval.Inventory.Domain.Entities;
using MediatR;

namespace Agaval.Inventory.Application.Features.Products.Create;

public sealed class CreateProductCommandHandler(
    IProductRepository productRepository,
    ICategoryRepository categoryRepository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<CreateProductCommand, ProductDto>
{
    public async Task<ProductDto> Handle(
        CreateProductCommand request,
        CancellationToken cancellationToken)
    {
        var category = await categoryRepository
            .GetActiveByIdAsync(request.CategoryId, cancellationToken)
            .ConfigureAwait(false)
            ?? throw new NotFoundException("la categoría activa", request.CategoryId);

        var product = new Product(
            request.Name,
            request.Description,
            request.Price,
            request.Stock,
            request.MinimumStock,
            request.CategoryId,
            timeProvider.GetUtcNow());

        productRepository.Add(product);
        await unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return ProductDto.FromEntity(product, category.Name);
    }
}
