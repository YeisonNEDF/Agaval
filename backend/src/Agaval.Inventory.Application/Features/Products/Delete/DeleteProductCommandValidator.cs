using FluentValidation;

namespace Agaval.Inventory.Application.Features.Products.Delete;

public sealed class DeleteProductCommandValidator : AbstractValidator<DeleteProductCommand>
{
    public DeleteProductCommandValidator()
    {
        RuleFor(command => command.Id).GreaterThan(0);
    }
}
