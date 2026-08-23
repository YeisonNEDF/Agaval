namespace Agaval.Inventory.Infrastructure.Authentication;

public sealed class AuthenticationOptions
{
    public const string SectionName = "Authentication";
    public const int MinimumSigningKeyLength = 32;

    public string Issuer { get; init; } = string.Empty;

    public string Audience { get; init; } = string.Empty;

    public string SigningKey { get; init; } = string.Empty;

    public string Username { get; init; } = string.Empty;

    public string Password { get; init; } = string.Empty;

    public string Role { get; init; } = "InventoryManager";

    public int TokenLifetimeMinutes { get; init; } = 120;

    public void Validate()
    {
        if (string.IsNullOrWhiteSpace(Issuer) || string.IsNullOrWhiteSpace(Audience))
        {
            throw new InvalidOperationException(
                "Authentication:Issuer y Authentication:Audience son obligatorios.");
        }

        if (SigningKey.Length < MinimumSigningKeyLength)
        {
            throw new InvalidOperationException(
                $"Authentication:SigningKey debe tener al menos {MinimumSigningKeyLength} caracteres.");
        }

        if (string.IsNullOrWhiteSpace(Username) || string.IsNullOrWhiteSpace(Password))
        {
            throw new InvalidOperationException(
                "Authentication:Username y Authentication:Password son obligatorios.");
        }

        if (string.IsNullOrWhiteSpace(Role) || TokenLifetimeMinutes is < 5 or > 1_440)
        {
            throw new InvalidOperationException(
                "Authentication:Role y un TokenLifetimeMinutes entre 5 y 1440 son obligatorios.");
        }
    }
}
