using FluentValidation;

namespace Agaval.Inventory.Application.Features.Categories.Delete;

public sealed class DeleteCategoryCommandValidator : AbstractValidator<DeleteCategoryCommand>
{
    public DeleteCategoryCommandValidator() => RuleFor(command => command.Id).GreaterThan(0);
}
