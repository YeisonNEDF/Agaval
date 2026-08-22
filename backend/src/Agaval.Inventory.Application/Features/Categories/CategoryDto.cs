using Agaval.Inventory.Domain.Entities;

namespace Agaval.Inventory.Application.Features.Categories;

public sealed record CategoryDto(int Id, string Name)
{
    internal static CategoryDto FromEntity(Category category) => new(category.Id, category.Name);
}
