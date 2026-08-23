using MediatR;

namespace Agaval.Inventory.Application.Features.Categories.GetList;

public sealed record GetCategoriesQuery(bool IncludeInactive) : IRequest<IReadOnlyList<CategoryDto>>;
