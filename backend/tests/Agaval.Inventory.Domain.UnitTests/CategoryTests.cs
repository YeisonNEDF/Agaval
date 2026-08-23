using Agaval.Inventory.Domain.Common;
using Agaval.Inventory.Domain.Entities;

namespace Agaval.Inventory.Domain.UnitTests;

public sealed class CategoryTests
{
    [Fact]
    public void ConstructorAndUpdateNormalizeValues()
    {
        var category = new Category("  Ferretería  ");

        category.Update("  Herramientas  ", false);

        Assert.Equal("Herramientas", category.Name);
        Assert.False(category.IsActive);
    }

    [Fact]
    public void DeactivatePreservesTheCategoryAndChangesItsState()
    {
        var category = new Category("Ferretería");

        category.Deactivate();

        Assert.False(category.IsActive);
    }

    [Fact]
    public void ConstructorRejectsAnEmptyName()
    {
        var exception = Assert.Throws<DomainException>(() => new Category("   "));

        Assert.Equal(
            "El nombre de la categoría es obligatorio y admite máximo 100 caracteres.",
            exception.Message);
    }
}
