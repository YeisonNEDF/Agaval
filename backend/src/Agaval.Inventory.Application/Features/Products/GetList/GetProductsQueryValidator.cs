using FluentValidation;

namespace Agaval.Inventory.Application.Features.Products.GetList;

public sealed class GetProductsQueryValidator : AbstractValidator<GetProductsQuery>
{
    public GetProductsQueryValidator()
    {
        RuleFor(query => query.CategoryId)
            .GreaterThan(0)
            .When(query => query.CategoryId.HasValue);

        RuleFor(query => query.Stock).IsInEnum();
    }
}
