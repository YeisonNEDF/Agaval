# 04. Base de datos SQL Server

## Estrategia elegida

La persistencia utiliza `Microsoft.EntityFrameworkCore.SqlServer`. El esquema se administra exclusivamente mediante migraciones EF Core; no se combina `EnsureCreated` con migrations.

`EnsureCreated` solo crea una fotografía inicial y no mantiene historial de evolución. `MigrateAsync` consulta `__EFMigrationsHistory`, crea la base cuando el usuario posee permisos y aplica únicamente las migraciones faltantes.

## Inicialización automática

`DatabaseInitializationExtensions.ApplyPendingMigrationsAsync` se ejecuta antes de recibir tráfico:

1. revisa `Database:ApplyMigrationsOnStartup`;
2. obtiene las migraciones pendientes;
3. si no hay ninguna, continúa sin modificar datos;
4. si faltan migraciones, llama `MigrateAsync`;
5. la migración inicial construye tablas, constraints, índices y seeds.

La opción está activa en `appsettings.Development.json` y Docker Compose. El archivo base y Kubernetes la mantienen desactivada.

## Qué crea la migración

- `Categorias` con Electrónica, Oficina y Aseo.
- `Productos` con dos registros demostrativos.
- `MovimientosInventario` para trazabilidad de entradas y salidas.
- claves primarias identity y claves foráneas;
- checks de precio, stock, stock mínimo, cantidad y tipo de movimiento;
- índice único de nombre de categoría e índices de consulta.

Los nombres y tipos principales respetan el enunciado: `int identity`, `nvarchar`, `bit`, `decimal(10,2)` y `datetime2`.

## Conexión local

La instancia incluida en Compose usa:

```text
Server=sqlserver,1433;Database=GestorInventarioDB;User Id=sa;Password=<MSSQL_SA_PASSWORD>;Encrypt=True;TrustServerCertificate=True
```

Cuando la API se ejecuta fuera de Docker, el host cambia a `localhost`.

La imagen Linux oficial de SQL Server se publica para x86-64. En equipos Apple Silicon, `platform: linux/amd64` solicita emulación; es útil para desarrollo si Docker la soporta, pero no constituye una plataforma SQL Server oficialmente soportada.

La clave de `.env.example` es solo para desarrollo. Una contraseña real se debe inyectar mediante variables de ambiente, user-secrets o el gestor de secretos de la plataforma.

## Ejecución manual

```bash
cd backend
dotnet tool restore
dotnet ef database update \
  --project src/Agaval.Inventory.Infrastructure \
  --startup-project src/Agaval.Inventory.Api
```

Script revisable:

```bash
dotnet ef migrations script --idempotent \
  --project src/Agaval.Inventory.Infrastructure \
  --startup-project src/Agaval.Inventory.Api \
  --output database/initial.sql
```

## Alcance de la detección

Una base nueva o vacía no contiene historial, por lo que EF aplica la migración completa. Una base actualizada no recibe inserts duplicados.

No se intenta reconstruir automáticamente una base incoherente cuya tabla `__EFMigrationsHistory` afirma que el esquema existe mientras alguna tabla fue borrada manualmente. Reparar ese estado podría destruir información; debe restaurarse desde respaldo o corregirse mediante una migración explícita.

## Producción

La migración al iniciar es cómoda en desarrollo, pero en producción se recomienda generar un script revisable o un migration bundle y ejecutarlo una sola vez desde el stage de Release. La identidad de runtime debería operar con permisos de lectura/escritura, no con permisos permanentes para alterar el esquema.
