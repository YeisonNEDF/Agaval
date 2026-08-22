using Agaval.Inventory.Domain.Common;
using Agaval.Inventory.Domain.Enums;

namespace Agaval.Inventory.Domain.Entities;

public sealed class Product
{
    public const int NameMaxLength = 150;
    public const int DescriptionMaxLength = 500;
    public const decimal MaxPrice = 99_999_999.99m;

    private readonly List<InventoryMovement> movements = [];

    private Product()
    {
    }

    public Product(
        string name,
        string? description,
        decimal price,
        int stock,
        int minimumStock,
        int categoryId,
        DateTimeOffset createdAt)
    {
        ApplyDetails(name, description, price, minimumStock, categoryId);

        if (stock < 0)
        {
            throw new DomainException("El stock no puede ser negativo.");
        }

        Stock = stock;
        CreatedAt = createdAt.ToUniversalTime();
    }

    public int Id { get; private set; }

    public string Name { get; private set; } = string.Empty;

    public string? Description { get; private set; }

    public decimal Price { get; private set; }

    public int Stock { get; private set; }

    public int MinimumStock { get; private set; }

    public int CategoryId { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    public Category Category { get; private set; } = null!;

    public IReadOnlyCollection<InventoryMovement> Movements => movements.AsReadOnly();

    public bool IsLowStock => Stock < MinimumStock;

    public void UpdateDetails(
        string name,
        string? description,
        decimal price,
        int stock,
        int minimumStock,
        int categoryId)
    {
        ApplyDetails(name, description, price, minimumStock, categoryId);

        if (stock < 0)
        {
            throw new DomainException("El stock no puede ser negativo.");
        }

        Stock = stock;
    }

    public void AdjustStock(
        StockMovementType type,
        int quantity,
        string? observation,
        DateTimeOffset occurredAt)
    {
        if (!Enum.IsDefined(type))
        {
            throw new DomainException("El tipo de movimiento de inventario no es válido.");
        }

        if (quantity <= 0)
        {
            throw new DomainException("La cantidad del movimiento debe ser mayor que cero.");
        }

        if (type == StockMovementType.Entry && Stock > int.MaxValue - quantity)
        {
            throw new DomainException("El movimiento supera la capacidad máxima admitida para el stock.");
        }

        var resultingStock = type == StockMovementType.Entry ? Stock + quantity : Stock - quantity;

        if (resultingStock < 0)
        {
            throw new DomainException("La salida solicitada supera el stock disponible.");
        }

        Stock = resultingStock;
        movements.Add(new InventoryMovement(Id, type, quantity, observation, occurredAt));
    }

    private void ApplyDetails(
        string name,
        string? description,
        decimal price,
        int minimumStock,
        int categoryId)
    {
        var normalizedName = name?.Trim() ?? string.Empty;
        if (normalizedName.Length is 0 or > NameMaxLength)
        {
            throw new DomainException($"El nombre del producto es obligatorio y admite máximo {NameMaxLength} caracteres.");
        }

        var normalizedDescription = description?.Trim();
        if (normalizedDescription?.Length > DescriptionMaxLength)
        {
            throw new DomainException($"La descripción admite máximo {DescriptionMaxLength} caracteres.");
        }

        var normalizedPrice = decimal.Round(price, 2, MidpointRounding.ToEven);
        if (normalizedPrice <= 0)
        {
            throw new DomainException("El precio debe ser mayor que cero.");
        }

        if (normalizedPrice > MaxPrice)
        {
            throw new DomainException($"El precio no puede superar {MaxPrice:N2}.");
        }

        if (minimumStock < 0)
        {
            throw new DomainException("El stock mínimo no puede ser negativo.");
        }

        if (categoryId <= 0)
        {
            throw new DomainException("La categoría del producto es obligatoria.");
        }

        Name = normalizedName;
        Description = string.IsNullOrWhiteSpace(normalizedDescription) ? null : normalizedDescription;
        Price = normalizedPrice;
        MinimumStock = minimumStock;
        CategoryId = categoryId;
    }
}
