using Agaval.Inventory.Application.Abstractions.Persistence;
using Agaval.Inventory.Application.Common.Exceptions;
using Agaval.Inventory.Domain.Entities;
using MediatR;

namespace Agaval.Inventory.Application.Features.Categories.Create;

public sealed class CreateCategoryCommandHandler(
    ICategoryRepository categoryRepository,
    IUnitOfWork unitOfWork) : IRequestHandler<CreateCategoryCommand, CategoryDto>
{
    public async Task<CategoryDto> Handle(
        CreateCategoryCommand request,
        CancellationToken cancellationToken)
    {
        var normalizedName = request.Name.Trim();
        if (await categoryRepository
                .NameExistsAsync(normalizedName, excludedId: null, cancellationToken)
                .ConfigureAwait(false))
        {
            throw new ConflictException($"Ya existe una categoría llamada '{normalizedName}'.");
        }

        var category = new Category(normalizedName);
        categoryRepository.Add(category);
        await unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return CategoryDto.FromEntity(category);
    }
}
