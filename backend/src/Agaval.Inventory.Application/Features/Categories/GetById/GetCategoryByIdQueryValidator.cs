using FluentValidation;

namespace Agaval.Inventory.Application.Features.Categories.GetById;

public sealed class GetCategoryByIdQueryValidator : AbstractValidator<GetCategoryByIdQuery>
{
    public GetCategoryByIdQueryValidator() => RuleFor(query => query.Id).GreaterThan(0);
}
