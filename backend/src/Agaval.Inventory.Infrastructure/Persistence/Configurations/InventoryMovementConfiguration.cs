using Agaval.Inventory.Domain.Entities;
using Agaval.Inventory.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Agaval.Inventory.Infrastructure.Persistence.Configurations;

internal sealed class InventoryMovementConfiguration : IEntityTypeConfiguration<InventoryMovement>
{
    public void Configure(EntityTypeBuilder<InventoryMovement> builder)
    {
        builder.ToTable(
            "MovimientosInventario",
            tableBuilder =>
            {
                tableBuilder.HasCheckConstraint("CK_Movimientos_Cantidad", "\"Cantidad\" > 0");
                tableBuilder.HasCheckConstraint(
                    "CK_Movimientos_Tipo",
                    "\"TipoMovimiento\" IN ('ENTRADA', 'SALIDA')");
            });

        builder.HasKey(movement => movement.Id).HasName("PK_MovimientosInventario");

        builder.Property(movement => movement.Id)
            .HasColumnName("Id")
            .ValueGeneratedOnAdd();

        builder.Property(movement => movement.ProductId)
            .HasColumnName("ProductoId")
            .IsRequired();

        builder.Property(movement => movement.Type)
            .HasColumnName("TipoMovimiento")
            .HasMaxLength(10)
            .HasConversion(
                type => type == StockMovementType.Entry ? "ENTRADA" : "SALIDA",
                value => value == "ENTRADA" ? StockMovementType.Entry : StockMovementType.Exit)
            .IsRequired();

        builder.Property(movement => movement.Quantity)
            .HasColumnName("Cantidad")
            .IsRequired();

        builder.Property(movement => movement.OccurredAt)
            .HasColumnName("Fecha")
            .HasColumnType("timestamp with time zone")
            .IsRequired();

        builder.Property(movement => movement.Observation)
            .HasColumnName("Observacion")
            .HasMaxLength(InventoryMovement.ObservationMaxLength);

        builder.HasOne(movement => movement.Product)
            .WithMany(product => product.Movements)
            .HasForeignKey(movement => movement.ProductId)
            .OnDelete(DeleteBehavior.Cascade)
            .HasConstraintName("FK_Movimientos_Productos");

        builder.HasIndex(movement => new { movement.ProductId, movement.OccurredAt })
            .HasDatabaseName("IX_Movimientos_ProductoId_Fecha");
    }
}
