using Agaval.Inventory.Application.Abstractions.Persistence;
using Agaval.Inventory.Application.Common.Exceptions;
using MediatR;

namespace Agaval.Inventory.Application.Features.Products.Delete;

public sealed class DeleteProductCommandHandler(
    IProductRepository productRepository,
    IUnitOfWork unitOfWork) : IRequestHandler<DeleteProductCommand>
{
    public async Task Handle(DeleteProductCommand request, CancellationToken cancellationToken)
    {
        var product = await productRepository
            .GetByIdAsync(request.Id, trackChanges: true, cancellationToken)
            .ConfigureAwait(false)
            ?? throw new NotFoundException("el producto", request.Id);

        productRepository.Remove(product);
        await unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }
}
