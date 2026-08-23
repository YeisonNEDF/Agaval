using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Agaval.Inventory.Application.Abstractions.Authentication;
using Agaval.Inventory.Application.Common.Models;

namespace Agaval.Inventory.Infrastructure.Authentication;

internal sealed class ConfiguredIdentityService(
    AuthenticationOptions authenticationOptions,
    TimeProvider timeProvider) : IIdentityService
{
    private readonly AuthenticationOptions options = Validate(authenticationOptions);

    public Task<AuthenticationToken?> AuthenticateAsync(
        string username,
        string password,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        if (!SecureEquals(username, options.Username) || !SecureEquals(password, options.Password))
        {
            return Task.FromResult<AuthenticationToken?>(null);
        }

        var issuedAt = timeProvider.GetUtcNow();
        var expiresAt = issuedAt.AddMinutes(options.TokenLifetimeMinutes);
        var accessToken = CreateToken(issuedAt, expiresAt);

        return Task.FromResult<AuthenticationToken?>(
            new AuthenticationToken(accessToken, expiresAt, options.Username, options.Role));
    }

    private string CreateToken(DateTimeOffset issuedAt, DateTimeOffset expiresAt)
    {
        var header = Base64UrlEncode(JsonSerializer.SerializeToUtf8Bytes(new
        {
            alg = "HS256",
            typ = "JWT",
        }));
        var payload = Base64UrlEncode(JsonSerializer.SerializeToUtf8Bytes(new Dictionary<string, object>
        {
            ["sub"] = options.Username,
            ["name"] = options.Username,
            ["role"] = options.Role,
            ["jti"] = Guid.NewGuid().ToString("N"),
            ["iss"] = options.Issuer,
            ["aud"] = options.Audience,
            ["iat"] = issuedAt.ToUnixTimeSeconds(),
            ["nbf"] = issuedAt.ToUnixTimeSeconds(),
            ["exp"] = expiresAt.ToUnixTimeSeconds(),
        }));
        var unsignedToken = $"{header}.{payload}";

        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(options.SigningKey));
        var signature = Base64UrlEncode(hmac.ComputeHash(Encoding.ASCII.GetBytes(unsignedToken)));
        return $"{unsignedToken}.{signature}";
    }

    private static bool SecureEquals(string provided, string expected)
    {
        var providedHash = SHA256.HashData(Encoding.UTF8.GetBytes(provided));
        var expectedHash = SHA256.HashData(Encoding.UTF8.GetBytes(expected));
        return CryptographicOperations.FixedTimeEquals(providedHash, expectedHash);
    }

    private static string Base64UrlEncode(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static AuthenticationOptions Validate(AuthenticationOptions options)
    {
        options.Validate();
        return options;
    }
}
