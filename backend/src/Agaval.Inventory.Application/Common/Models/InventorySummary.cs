namespace Agaval.Inventory.Application.Common.Models;

public sealed record InventorySummary(int TotalProducts, int LowStockProducts, decimal InventoryValue);
