using MediatR;

namespace Agaval.Inventory.Application.Features.Categories.Delete;

public sealed record DeleteCategoryCommand(int Id) : IRequest;
