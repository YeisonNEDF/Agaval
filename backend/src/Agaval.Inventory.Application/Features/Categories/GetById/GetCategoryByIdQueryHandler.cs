using Agaval.Inventory.Application.Abstractions.Persistence;
using Agaval.Inventory.Application.Common.Exceptions;
using MediatR;

namespace Agaval.Inventory.Application.Features.Categories.GetById;

public sealed class GetCategoryByIdQueryHandler(ICategoryRepository categoryRepository)
    : IRequestHandler<GetCategoryByIdQuery, CategoryDto>
{
    public async Task<CategoryDto> Handle(
        GetCategoryByIdQuery request,
        CancellationToken cancellationToken)
    {
        var category = await categoryRepository
            .GetByIdAsync(request.Id, trackChanges: false, cancellationToken)
            .ConfigureAwait(false)
            ?? throw new NotFoundException("la categoría", request.Id);

        return CategoryDto.FromEntity(category);
    }
}
