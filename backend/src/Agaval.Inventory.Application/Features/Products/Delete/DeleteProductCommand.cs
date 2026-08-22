using MediatR;

namespace Agaval.Inventory.Application.Features.Products.Delete;

public sealed record DeleteProductCommand(int Id) : IRequest;
