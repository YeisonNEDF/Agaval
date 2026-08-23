using System.Net.Http.Headers;
using System.Net.Http.Json;
using Agaval.Inventory.Api.Contracts.Authentication;
using Agaval.Inventory.Application.Features.Authentication.Login;

namespace Agaval.Inventory.Api.FunctionalTests;

internal static class AuthenticationTestExtensions
{
    public static async Task AuthenticateManagerAsync(this HttpClient client)
    {
        var response = await client.PostAsJsonAsync(
            "/api/autenticacion/login",
            new LoginRequest("test-manager", "Test_password_2026!"));
        response.EnsureSuccessStatusCode();

        var session = await response.Content.ReadFromJsonAsync<LoginDto>();
        ArgumentNullException.ThrowIfNull(session);
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", session.AccessToken);
    }
}
