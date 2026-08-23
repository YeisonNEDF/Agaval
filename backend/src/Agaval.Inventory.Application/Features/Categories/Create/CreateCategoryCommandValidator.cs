using Agaval.Inventory.Domain.Entities;
using FluentValidation;

namespace Agaval.Inventory.Application.Features.Categories.Create;

public sealed class CreateCategoryCommandValidator : AbstractValidator<CreateCategoryCommand>
{
    public CreateCategoryCommandValidator()
    {
        RuleFor(command => command.Name).NotEmpty().MaximumLength(Category.NameMaxLength);
    }
}
