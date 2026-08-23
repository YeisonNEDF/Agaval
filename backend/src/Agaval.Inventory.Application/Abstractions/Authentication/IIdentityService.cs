using Agaval.Inventory.Application.Common.Models;

namespace Agaval.Inventory.Application.Abstractions.Authentication;

public interface IIdentityService
{
    Task<AuthenticationToken?> AuthenticateAsync(
        string username,
        string password,
        CancellationToken cancellationToken);
}
