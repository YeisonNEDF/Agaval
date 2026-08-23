using MediatR;

namespace Agaval.Inventory.Application.Features.Authentication.Login;

public sealed record LoginCommand(string Username, string Password) : IRequest<LoginDto>;
