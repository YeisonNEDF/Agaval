using Agaval.Inventory.Domain.Entities;

namespace Agaval.Inventory.Application.Features.Products;

public sealed record ProductDto(
    int Id,
    string Name,
    string? Description,
    decimal Price,
    int Stock,
    int MinimumStock,
    bool IsLowStock,
    int CategoryId,
    string CategoryName,
    DateTimeOffset CreatedAt)
{
    internal static ProductDto FromEntity(Product product, string? categoryName = null) =>
        new(
            product.Id,
            product.Name,
            product.Description,
            product.Price,
            product.Stock,
            product.MinimumStock,
            product.IsLowStock,
            product.CategoryId,
            categoryName ?? product.Category.Name,
            product.CreatedAt);
}
