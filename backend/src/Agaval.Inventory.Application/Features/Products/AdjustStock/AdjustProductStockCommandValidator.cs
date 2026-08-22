using Agaval.Inventory.Domain.Entities;
using FluentValidation;

namespace Agaval.Inventory.Application.Features.Products.AdjustStock;

public sealed class AdjustProductStockCommandValidator : AbstractValidator<AdjustProductStockCommand>
{
    public AdjustProductStockCommandValidator()
    {
        RuleFor(command => command.ProductId).GreaterThan(0);
        RuleFor(command => command.Type).IsInEnum();
        RuleFor(command => command.Quantity).GreaterThan(0);
        RuleFor(command => command.Observation).MaximumLength(InventoryMovement.ObservationMaxLength);
    }
}
