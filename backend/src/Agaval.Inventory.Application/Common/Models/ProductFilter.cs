namespace Agaval.Inventory.Application.Common.Models;

public sealed record ProductFilter(
    int? CategoryId = null,
    StockFilter Stock = StockFilter.All,
    string? Search = null,
    int PageNumber = 1,
    int PageSize = 10,
    ProductSortField SortBy = ProductSortField.Name,
    SortDirection SortDirection = SortDirection.Ascending);
