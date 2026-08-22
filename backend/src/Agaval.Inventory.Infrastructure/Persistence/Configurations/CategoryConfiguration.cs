using Agaval.Inventory.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Agaval.Inventory.Infrastructure.Persistence.Configurations;

internal sealed class CategoryConfiguration : IEntityTypeConfiguration<Category>
{
    public void Configure(EntityTypeBuilder<Category> builder)
    {
        builder.ToTable("Categorias");
        builder.HasKey(category => category.Id).HasName("PK_Categorias");

        builder.Property(category => category.Id)
            .HasColumnName("Id")
            .ValueGeneratedOnAdd();

        builder.Property(category => category.Name)
            .HasColumnName("Nombre")
            .HasMaxLength(Category.NameMaxLength)
            .IsRequired();

        builder.Property(category => category.IsActive)
            .HasColumnName("Activo")
            .HasDefaultValue(true)
            .IsRequired();

        builder.HasIndex(category => category.Name)
            .IsUnique()
            .HasDatabaseName("UX_Categorias_Nombre");

        builder.HasData(
            new { Id = 1, Name = "Electrónica", IsActive = true },
            new { Id = 2, Name = "Oficina", IsActive = true },
            new { Id = 3, Name = "Aseo", IsActive = true });
    }
}
