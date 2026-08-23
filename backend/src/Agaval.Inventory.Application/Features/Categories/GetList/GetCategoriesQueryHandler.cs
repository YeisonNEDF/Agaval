using Agaval.Inventory.Application.Abstractions.Persistence;
using MediatR;

namespace Agaval.Inventory.Application.Features.Categories.GetList;

public sealed class GetCategoriesQueryHandler(ICategoryRepository categoryRepository)
    : IRequestHandler<GetCategoriesQuery, IReadOnlyList<CategoryDto>>
{
    public async Task<IReadOnlyList<CategoryDto>> Handle(
        GetCategoriesQuery request,
        CancellationToken cancellationToken)
    {
        var categories = await categoryRepository
            .ListAsync(request.IncludeInactive, cancellationToken)
            .ConfigureAwait(false);

        return categories.Select(CategoryDto.FromEntity).ToArray();
    }
}
