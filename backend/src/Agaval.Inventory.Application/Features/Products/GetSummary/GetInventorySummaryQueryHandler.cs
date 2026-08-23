using Agaval.Inventory.Application.Abstractions.Persistence;
using Agaval.Inventory.Application.Common.Models;
using MediatR;

namespace Agaval.Inventory.Application.Features.Products.GetSummary;

public sealed class GetInventorySummaryQueryHandler(IProductRepository productRepository)
    : IRequestHandler<GetInventorySummaryQuery, InventorySummary>
{
    public Task<InventorySummary> Handle(
        GetInventorySummaryQuery request,
        CancellationToken cancellationToken) =>
        productRepository.GetSummaryAsync(cancellationToken);
}
