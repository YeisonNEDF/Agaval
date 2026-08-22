using Agaval.Inventory.Application.Abstractions.Persistence;
using MediatR;

namespace Agaval.Inventory.Application.Features.Categories;

public sealed class GetActiveCategoriesQueryHandler(ICategoryRepository categoryRepository)
    : IRequestHandler<GetActiveCategoriesQuery, IReadOnlyList<CategoryDto>>
{
    public async Task<IReadOnlyList<CategoryDto>> Handle(
        GetActiveCategoriesQuery request,
        CancellationToken cancellationToken)
    {
        var categories = await categoryRepository.ListActiveAsync(cancellationToken).ConfigureAwait(false);
        return categories.Select(CategoryDto.FromEntity).ToArray();
    }
}
