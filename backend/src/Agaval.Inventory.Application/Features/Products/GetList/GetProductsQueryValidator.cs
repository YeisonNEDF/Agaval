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
        RuleFor(query => query.Search).MaximumLength(150);
        RuleFor(query => query.PageNumber).GreaterThan(0);
        RuleFor(query => query.PageSize).InclusiveBetween(5, 100);
        RuleFor(query => query.SortBy).IsInEnum();
        RuleFor(query => query.SortDirection).IsInEnum();
    }
}
