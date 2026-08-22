using Agaval.Inventory.Domain.Common;
using Agaval.Inventory.Domain.Enums;

namespace Agaval.Inventory.Domain.Entities;

public sealed class InventoryMovement
{
    public const int ObservationMaxLength = 255;

    private InventoryMovement()
    {
    }

    internal InventoryMovement(
        int productId,
        StockMovementType type,
        int quantity,
        string? observation,
        DateTimeOffset occurredAt)
    {
        if (productId < 0)
        {
            throw new DomainException("El identificador del producto no puede ser negativo.");
        }

        if (!Enum.IsDefined(type))
        {
            throw new DomainException("El tipo de movimiento de inventario no es válido.");
        }

        if (quantity <= 0)
        {
            throw new DomainException("La cantidad del movimiento debe ser mayor que cero.");
        }

        var normalizedObservation = observation?.Trim();
        if (normalizedObservation?.Length > ObservationMaxLength)
        {
            throw new DomainException($"La observación admite máximo {ObservationMaxLength} caracteres.");
        }

        ProductId = productId;
        Type = type;
        Quantity = quantity;
        Observation = string.IsNullOrWhiteSpace(normalizedObservation) ? null : normalizedObservation;
        OccurredAt = occurredAt.ToUniversalTime();
    }

    public int Id { get; private set; }

    public int ProductId { get; private set; }

    public StockMovementType Type { get; private set; }

    public int Quantity { get; private set; }

    public DateTimeOffset OccurredAt { get; private set; }

    public string? Observation { get; private set; }

    public Product Product { get; private set; } = null!;
}
