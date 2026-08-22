using Agaval.Inventory.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Agaval.Inventory.Infrastructure.Persistence.Configurations;

internal sealed class ProductConfiguration : IEntityTypeConfiguration<Product>
{
    private static readonly DateTimeOffset SeedDate = new(2026, 8, 1, 12, 0, 0, TimeSpan.Zero);

    public void Configure(EntityTypeBuilder<Product> builder)
    {
        builder.ToTable(
            "Productos",
            tableBuilder =>
            {
                tableBuilder.HasCheckConstraint("CK_Productos_Precio", "[Precio] > 0");
                tableBuilder.HasCheckConstraint("CK_Productos_Stock", "[Stock] >= 0");
                tableBuilder.HasCheckConstraint("CK_Productos_StockMinimo", "[StockMinimo] >= 0");
            });

        builder.HasKey(product => product.Id).HasName("PK_Productos");

        builder.Property(product => product.Id)
            .HasColumnName("Id")
            .ValueGeneratedOnAdd();

        builder.Property(product => product.Name)
            .HasColumnName("Nombre")
            .HasMaxLength(Product.NameMaxLength)
            .IsRequired();

        builder.Property(product => product.Description)
            .HasColumnName("Descripcion")
            .HasMaxLength(Product.DescriptionMaxLength);

        builder.Property(product => product.Price)
            .HasColumnName("Precio")
            .HasPrecision(10, 2)
            .IsRequired();

        builder.Property(product => product.Stock)
            .HasColumnName("Stock")
            .HasDefaultValue(0)
            .IsRequired();

        builder.Property(product => product.MinimumStock)
            .HasColumnName("StockMinimo")
            .HasDefaultValue(5)
            .IsRequired();

        builder.Property(product => product.CategoryId)
            .HasColumnName("CategoriaId")
            .IsRequired();

        builder.Property(product => product.CreatedAt)
            .HasColumnName("FechaCreacion")
            .HasConversion(
                createdAt => createdAt.UtcDateTime,
                storedAt => new DateTimeOffset(DateTime.SpecifyKind(storedAt, DateTimeKind.Utc)))
            .HasColumnType("datetime2")
            .HasDefaultValueSql("SYSUTCDATETIME()")
            .IsRequired();

        builder.Ignore(product => product.IsLowStock);

        builder.HasOne(product => product.Category)
            .WithMany()
            .HasForeignKey(product => product.CategoryId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_Productos_Categorias");

        builder.HasIndex(product => product.CategoryId)
            .HasDatabaseName("IX_Productos_CategoriaId");

        builder.HasIndex(product => product.CreatedAt)
            .HasDatabaseName("IX_Productos_FechaCreacion");

        builder.Navigation(product => product.Movements)
            .UsePropertyAccessMode(PropertyAccessMode.Field);

        builder.HasData(
            new
            {
                Id = 1,
                Name = "Teclado mecánico",
                Description = "Teclado compacto para estaciones de trabajo.",
                Price = 249_900m,
                Stock = 4,
                MinimumStock = 5,
                CategoryId = 1,
                CreatedAt = SeedDate,
            },
            new
            {
                Id = 2,
                Name = "Resma de papel carta",
                Description = "Papel blanco de 75 gramos, paquete de 500 hojas.",
                Price = 24_500m,
                Stock = 18,
                MinimumStock = 8,
                CategoryId = 2,
                CreatedAt = SeedDate,
            });
    }
}
