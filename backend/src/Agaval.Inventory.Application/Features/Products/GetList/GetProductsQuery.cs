using Agaval.Inventory.Application.Common.Models;
using MediatR;

namespace Agaval.Inventory.Application.Features.Products.GetList;

public sealed record GetProductsQuery(
    int? CategoryId,
    StockFilter Stock,
    string? Search,
    int PageNumber,
    int PageSize,
    ProductSortField SortBy,
    SortDirection SortDirection) : IRequest<PagedResult<ProductDto>>;
