using MediatR;

namespace Agaval.Inventory.Application.Features.Categories.GetById;

public sealed record GetCategoryByIdQuery(int Id) : IRequest<CategoryDto>;
