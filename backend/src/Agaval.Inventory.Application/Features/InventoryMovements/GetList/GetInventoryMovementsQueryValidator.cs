using FluentValidation;

namespace Agaval.Inventory.Application.Features.InventoryMovements.GetList;

public sealed class GetInventoryMovementsQueryValidator
    : AbstractValidator<GetInventoryMovementsQuery>
{
    public GetInventoryMovementsQueryValidator()
    {
        RuleFor(query => query.ProductId).GreaterThan(0).When(query => query.ProductId.HasValue);
        RuleFor(query => query.Type).IsInEnum().When(query => query.Type.HasValue);
        RuleFor(query => query.PageNumber).GreaterThan(0);
        RuleFor(query => query.PageSize).InclusiveBetween(5, 100);
        RuleFor(query => query.SortDirection).IsInEnum();
    }
}
