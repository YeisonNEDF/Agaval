namespace Agaval.Inventory.Application.Common.Models;

public sealed record ProductFilter(int? CategoryId = null, StockFilter Stock = StockFilter.All);
