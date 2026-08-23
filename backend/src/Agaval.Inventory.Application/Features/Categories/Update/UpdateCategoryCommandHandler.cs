using Agaval.Inventory.Application.Abstractions.Persistence;
using Agaval.Inventory.Application.Common.Exceptions;
using MediatR;

namespace Agaval.Inventory.Application.Features.Categories.Update;

public sealed class UpdateCategoryCommandHandler(
    ICategoryRepository categoryRepository,
    IUnitOfWork unitOfWork) : IRequestHandler<UpdateCategoryCommand, CategoryDto>
{
    public async Task<CategoryDto> Handle(
        UpdateCategoryCommand request,
        CancellationToken cancellationToken)
    {
        var category = await categoryRepository
            .GetByIdAsync(request.Id, trackChanges: true, cancellationToken)
            .ConfigureAwait(false)
            ?? throw new NotFoundException("la categoría", request.Id);

        var normalizedName = request.Name.Trim();
        if (await categoryRepository
                .NameExistsAsync(normalizedName, request.Id, cancellationToken)
                .ConfigureAwait(false))
        {
            throw new ConflictException($"Ya existe una categoría llamada '{normalizedName}'.");
        }

        category.Update(normalizedName, request.IsActive);
        await unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return CategoryDto.FromEntity(category);
    }
}
