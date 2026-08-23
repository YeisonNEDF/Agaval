using MediatR;

namespace Agaval.Inventory.Application.Features.Categories.Update;

public sealed record UpdateCategoryCommand(int Id, string Name, bool IsActive) : IRequest<CategoryDto>;
