using MediatR;

namespace Agaval.Inventory.Application.Features.Categories.Create;

public sealed record CreateCategoryCommand(string Name) : IRequest<CategoryDto>;
