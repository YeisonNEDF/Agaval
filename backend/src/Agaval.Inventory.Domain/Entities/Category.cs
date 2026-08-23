using Agaval.Inventory.Domain.Common;

namespace Agaval.Inventory.Domain.Entities;

public sealed class Category
{
    public const int NameMaxLength = 100;

    private Category()
    {
    }

    public Category(string name)
    {
        Name = NormalizeName(name);
        IsActive = true;
    }

    public Category(int id, string name, bool isActive = true)
    {
        if (id <= 0)
        {
            throw new DomainException("El identificador de la categoría debe ser mayor que cero.");
        }

        Id = id;
        Name = NormalizeName(name);
        IsActive = isActive;
    }

    public int Id { get; private set; }

    public string Name { get; private set; } = string.Empty;

    public bool IsActive { get; private set; }

    public void Update(string name, bool isActive)
    {
        Name = NormalizeName(name);
        IsActive = isActive;
    }

    public void Deactivate() => IsActive = false;

    private static string NormalizeName(string name)
    {
        var normalizedName = name?.Trim() ?? string.Empty;

        if (normalizedName.Length is 0 or > NameMaxLength)
        {
            throw new DomainException($"El nombre de la categoría es obligatorio y admite máximo {NameMaxLength} caracteres.");
        }

        return normalizedName;
    }
}
