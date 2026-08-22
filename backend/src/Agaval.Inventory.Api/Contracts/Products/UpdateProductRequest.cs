namespace Agaval.Inventory.Api.Contracts.Products;

public sealed record UpdateProductRequest(
    string Name,
    string? Description,
    decimal Price,
    int Stock,
    int MinimumStock,
    int CategoryId);
