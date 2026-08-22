using MediatR;

namespace Agaval.Inventory.Application.Features.Categories;

public sealed record GetActiveCategoriesQuery : IRequest<IReadOnlyList<CategoryDto>>;
