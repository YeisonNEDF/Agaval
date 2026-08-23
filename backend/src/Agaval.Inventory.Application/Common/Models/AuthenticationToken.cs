namespace Agaval.Inventory.Application.Common.Models;

public sealed record AuthenticationToken(
    string AccessToken,
    DateTimeOffset ExpiresAt,
    string Username,
    string Role);
