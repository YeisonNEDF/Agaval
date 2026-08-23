using Agaval.Inventory.Api.Contracts.Authentication;
using Agaval.Inventory.Application.Features.Authentication.Login;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Agaval.Inventory.Api.Controllers;

[ApiController]
[Route("api/autenticacion")]
public sealed class AuthenticationController(ISender sender) : ControllerBase
{
    [AllowAnonymous]
    [HttpPost("login")]
    [ProducesResponseType<LoginDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<LoginDto>> Login(
        LoginRequest request,
        CancellationToken cancellationToken)
    {
        var session = await sender
            .Send(new LoginCommand(request.Username, request.Password), cancellationToken)
            .ConfigureAwait(false);

        return Ok(session);
    }
}
