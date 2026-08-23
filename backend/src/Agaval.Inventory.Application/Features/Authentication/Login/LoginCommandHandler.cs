using Agaval.Inventory.Application.Abstractions.Authentication;
using Agaval.Inventory.Application.Common.Exceptions;
using MediatR;

namespace Agaval.Inventory.Application.Features.Authentication.Login;

public sealed class LoginCommandHandler(IIdentityService identityService)
    : IRequestHandler<LoginCommand, LoginDto>
{
    public async Task<LoginDto> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        var token = await identityService
            .AuthenticateAsync(request.Username.Trim(), request.Password, cancellationToken)
            .ConfigureAwait(false)
            ?? throw new AuthenticationFailedException();

        return LoginDto.FromToken(token);
    }
}
