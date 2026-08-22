using System.ComponentModel.DataAnnotations;

namespace Agaval.Inventory.Api.Contracts.Products;

public sealed record UpdateProductRequest(
    [property: Required, MaxLength(150)] string Name,
    [property: MaxLength(500)] string? Description,
    [property: Range(typeof(decimal), "0.01", "99999999.99")] decimal Price,
    [property: Range(0, int.MaxValue)] int Stock,
    [property: Range(0, int.MaxValue)] int MinimumStock,
    [property: Range(1, int.MaxValue)] int CategoryId);
