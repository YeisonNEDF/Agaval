using Agaval.Inventory.Domain.Common;
using Agaval.Inventory.Domain.Entities;
using Agaval.Inventory.Domain.Enums;

namespace Agaval.Inventory.Domain.UnitTests;

public sealed class ProductTests
{
    private static readonly DateTimeOffset CreatedAt = new(2026, 8, 22, 12, 0, 0, TimeSpan.Zero);

    [Fact]
    public void ConstructorNormalizesInputAndCalculatesLowStock()
    {
        var product = CreateProduct(stock: 2, minimumStock: 5);

        Assert.Equal("Teclado", product.Name);
        Assert.Equal("Mecánico", product.Description);
        Assert.Equal(249_900m, product.Price);
        Assert.True(product.IsLowStock);
        Assert.Equal(CreatedAt, product.CreatedAt);
    }

    [Fact]
    public void ConstructorThrowsWhenPriceIsNotPositive()
    {
        var exception = Assert.Throws<DomainException>(() => CreateProduct(price: 0));

        Assert.Equal("El precio debe ser mayor que cero.", exception.Message);
    }

    [Fact]
    public void ConstructorThrowsWhenPriceRoundsToZero()
    {
        var exception = Assert.Throws<DomainException>(() => CreateProduct(price: 0.001m));

        Assert.Equal("El precio debe ser mayor que cero.", exception.Message);
    }

    [Fact]
    public void UpdateDetailsChangesEditableFieldsAndStock()
    {
        var product = CreateProduct();

        product.UpdateDetails("Mouse", null, 89_900m, 12, 3, 2);

        Assert.Equal("Mouse", product.Name);
        Assert.Null(product.Description);
        Assert.Equal(89_900m, product.Price);
        Assert.Equal(12, product.Stock);
        Assert.Equal(3, product.MinimumStock);
        Assert.Equal(2, product.CategoryId);
    }

    [Fact]
    public void AdjustStockEntryAddsStockAndMovement()
    {
        var product = CreateProduct(stock: 4);

        product.AdjustStock(StockMovementType.Entry, 6, "  Compra mensual  ", CreatedAt.AddDays(1));

        Assert.Equal(10, product.Stock);
        var movement = Assert.Single(product.Movements);
        Assert.Equal(StockMovementType.Entry, movement.Type);
        Assert.Equal(6, movement.Quantity);
        Assert.Equal("Compra mensual", movement.Observation);
    }

    [Fact]
    public void AdjustStockExitPreservesStockAndThrowsWhenQuantityExceedsAvailability()
    {
        var product = CreateProduct(stock: 4);

        var exception = Assert.Throws<DomainException>(() =>
            product.AdjustStock(StockMovementType.Exit, 5, null, CreatedAt));

        Assert.Equal("La salida solicitada supera el stock disponible.", exception.Message);
        Assert.Equal(4, product.Stock);
        Assert.Empty(product.Movements);
    }

    private static Product CreateProduct(
        decimal price = 249_900m,
        int stock = 8,
        int minimumStock = 5) =>
        new("  Teclado  ", "  Mecánico  ", price, stock, minimumStock, 1, CreatedAt);
}
