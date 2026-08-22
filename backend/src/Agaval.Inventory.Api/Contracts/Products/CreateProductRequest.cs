namespace Agaval.Inventory.Api.Contracts.Products;

public sealed record CreateProductRequest(
    string Name,
    string? Description,
    decimal Price,
    int Stock,
    int MinimumStock,
    int CategoryId);
