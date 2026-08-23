using Agaval.Inventory.Application.Common.Models;

namespace Agaval.Inventory.Application.Features.Authentication.Login;

public sealed record LoginDto(
    string AccessToken,
    DateTimeOffset ExpiresAt,
    string Username,
    string Role)
{
    internal static LoginDto FromToken(AuthenticationToken token) =>
        new(token.AccessToken, token.ExpiresAt, token.Username, token.Role);
}
