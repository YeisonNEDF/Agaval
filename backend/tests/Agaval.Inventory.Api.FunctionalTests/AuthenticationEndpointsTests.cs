using System.Net;
using System.Net.Http.Json;
using Agaval.Inventory.Api.Contracts.Authentication;
using Agaval.Inventory.Application.Features.Authentication.Login;

namespace Agaval.Inventory.Api.FunctionalTests;

public sealed class AuthenticationEndpointsTests
{
    [Fact]
    public async Task LoginReturnsSignedSessionAndRejectsInvalidCredentials()
    {
        await using var factory = new InventoryApiFactory();
        using var client = factory.CreateClient();

        var invalidResponse = await client.PostAsJsonAsync(
            "/api/autenticacion/login",
            new LoginRequest("test-manager", "incorrecta"));
        Assert.Equal(HttpStatusCode.Unauthorized, invalidResponse.StatusCode);

        var response = await client.PostAsJsonAsync(
            "/api/autenticacion/login",
            new LoginRequest("test-manager", "Test_password_2026!"));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var session = await response.Content.ReadFromJsonAsync<LoginDto>();
        Assert.NotNull(session);
        Assert.Equal("test-manager", session.Username);
        Assert.Equal("InventoryManager", session.Role);
        Assert.Equal(3, session.AccessToken.Split('.').Length);
        Assert.True(session.ExpiresAt > DateTimeOffset.UtcNow);
    }
}
