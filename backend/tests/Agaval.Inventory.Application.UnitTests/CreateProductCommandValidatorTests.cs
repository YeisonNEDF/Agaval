using Agaval.Inventory.Application.Features.Products.Create;

namespace Agaval.Inventory.Application.UnitTests;

public sealed class CreateProductCommandValidatorTests
{
    [Fact]
    public async Task ValidateReturnsExpectedFailuresForInvalidBusinessInput()
    {
        var validator = new CreateProductCommandValidator();
        var command = new CreateProductCommand(string.Empty, null, 0, -1, -1, 0);

        var result = await validator.ValidateAsync(command);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, failure => failure.PropertyName == nameof(command.Name));
        Assert.Contains(result.Errors, failure => failure.PropertyName == nameof(command.Price));
        Assert.Contains(result.Errors, failure => failure.PropertyName == nameof(command.Stock));
        Assert.Contains(result.Errors, failure => failure.PropertyName == nameof(command.MinimumStock));
        Assert.Contains(result.Errors, failure => failure.PropertyName == nameof(command.CategoryId));
    }
}
