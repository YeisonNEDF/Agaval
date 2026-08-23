# AGAVAL Backend

API REST del gestor de inventario construida con .NET 10, Clean Architecture, CQRS, MediatR, FluentValidation, Entity Framework Core y SQL Server.

## Arquitectura

```text
src/
├── Agaval.Inventory.Domain
├── Agaval.Inventory.Application
├── Agaval.Inventory.Infrastructure
└── Agaval.Inventory.Api

tests/
├── Agaval.Inventory.Api.FunctionalTests
├── Agaval.Inventory.Domain.UnitTests
└── Agaval.Inventory.Application.UnitTests
```

La regla de dependencias es:

```text
API -> Application -> Domain
Infrastructure -> Application -> Domain
```

## Requisitos

- .NET SDK 10.
- SQL Server 2022 en `localhost:1433` o una instancia accesible.

La configuración Development usa:

```text
Server=localhost,1433;Database=GestorInventarioDB;User Id=sa;Password=Agaval_local_2026!;Encrypt=True;TrustServerCertificate=True
```

Para usar otra conexión:

```bash
export ConnectionStrings__Database='Server=SERVIDOR;Database=GestorInventarioDB;User Id=USUARIO;Password=CLAVE;Encrypt=True;TrustServerCertificate=True'
```

## Ejecutar

```bash
dotnet restore Agaval.Inventory.slnx
dotnet run --project src/Agaval.Inventory.Api --launch-profile http
```

En Development, la API detecta y aplica automáticamente las migraciones pendientes. Una base nueva recibe las tablas, categorías y productos demostrativos incluidos en el seed.

- API: `http://localhost:5100`
- Swagger: `http://localhost:5100/swagger`
- Health check: `http://localhost:5100/health`

## Autenticación y permisos

Las consultas son públicas. Crear, modificar, desactivar/eliminar o ajustar stock exige un JWT con el rol `InventoryManager`. La cuenta Development incluida es `admin` / `Agaval_admin_2026!`; se obtiene el token mediante `POST /api/autenticacion/login`. Todas las opciones se reemplazan con variables `Authentication__*` o con las variables `AUTH_*` que traducen los launchers y Compose.

## Contrato adicional

- `GET /api/productos`: búsqueda, filtros, orden y paginación server-side.
- `GET /api/productos/resumen`: métricas globales sin depender de la página actual.
- `GET /api/movimientos-inventario`: historial paginado por producto y tipo.
- `GET/POST/PUT/DELETE /api/categorias`: administración completa; DELETE desactiva para conservar referencias históricas.
- `POST /api/autenticacion/login`: sesión JWT firmada y con expiración.

## Migraciones

```bash
dotnet tool restore
dotnet ef database update \
  --project src/Agaval.Inventory.Infrastructure \
  --startup-project src/Agaval.Inventory.Api
```

El script SQL Server idempotente se encuentra en [`database/initial.sql`](database/initial.sql).

## Calidad

```bash
dotnet format Agaval.Inventory.slnx --verify-no-changes --no-restore
dotnet build Agaval.Inventory.slnx --configuration Release
dotnet test Agaval.Inventory.slnx --configuration Release --no-build
dotnet list Agaval.Inventory.slnx package --vulnerable --include-transitive
```

Resultados de la última verificación: 17 pruebas aprobadas, incluidas autenticación, CRUD de categorías, paginación, historial y el ciclo HTTP de productos; build Release sin warnings ni errores.
