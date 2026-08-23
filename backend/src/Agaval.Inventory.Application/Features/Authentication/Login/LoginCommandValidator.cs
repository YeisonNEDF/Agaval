using FluentValidation;

namespace Agaval.Inventory.Application.Features.Authentication.Login;

public sealed class LoginCommandValidator : AbstractValidator<LoginCommand>
{
    public LoginCommandValidator()
    {
        RuleFor(command => command.Username).NotEmpty().MaximumLength(100);
        RuleFor(command => command.Password).NotEmpty().MaximumLength(200);
    }
}
