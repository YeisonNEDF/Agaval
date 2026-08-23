using Agaval.Inventory.Domain.Entities;
using FluentValidation;

namespace Agaval.Inventory.Application.Features.Categories.Update;

public sealed class UpdateCategoryCommandValidator : AbstractValidator<UpdateCategoryCommand>
{
    public UpdateCategoryCommandValidator()
    {
        RuleFor(command => command.Id).GreaterThan(0);
        RuleFor(command => command.Name).NotEmpty().MaximumLength(Category.NameMaxLength);
    }
}
