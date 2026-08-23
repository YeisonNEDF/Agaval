using Agaval.Inventory.Domain.Entities;

namespace Agaval.Inventory.Application.Features.InventoryMovements;

public sealed record InventoryMovementDto(
    int Id,
    int ProductId,
    string ProductName,
    string Type,
    int Quantity,
    DateTimeOffset OccurredAt,
    string? Observation)
{
    internal static InventoryMovementDto FromEntity(InventoryMovement movement) =>
        new(
            movement.Id,
            movement.ProductId,
            movement.Product.Name,
            movement.Type.ToString(),
            movement.Quantity,
            movement.OccurredAt,
            movement.Observation);
}
