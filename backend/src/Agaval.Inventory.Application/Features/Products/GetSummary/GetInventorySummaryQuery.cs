using Agaval.Inventory.Application.Common.Models;
using MediatR;

namespace Agaval.Inventory.Application.Features.Products.GetSummary;

public sealed record GetInventorySummaryQuery : IRequest<InventorySummary>;
