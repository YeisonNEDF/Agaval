using Agaval.Inventory.Domain.Entities;
using FluentValidation;

namespace Agaval.Inventory.Application.Features.Products.Update;

public sealed class UpdateProductCommandValidator : AbstractValidator<UpdateProductCommand>
{
    public UpdateProductCommandValidator()
    {
        RuleFor(command => command.Id).GreaterThan(0);

        RuleFor(command => command.Name)
            .NotEmpty()
            .MaximumLength(Product.NameMaxLength);

        RuleFor(command => command.Description)
            .MaximumLength(Product.DescriptionMaxLength);

        RuleFor(command => command.Price)
            .GreaterThanOrEqualTo(0.01m)
            .LessThanOrEqualTo(Product.MaxPrice);

        RuleFor(command => command.Stock).GreaterThanOrEqualTo(0);
        RuleFor(command => command.MinimumStock).GreaterThanOrEqualTo(0);
        RuleFor(command => command.CategoryId).GreaterThan(0);
    }
}
