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
- SQL Server LocalDB en Windows o una instancia SQL Server accesible.

La configuración Development usa:

```text
Server=(localdb)\MSSQLLocalDB;Database=GestorInventarioDB;Trusted_Connection=True;TrustServerCertificate=True;
```

Para usar otra conexión:

```bash
export ConnectionStrings__Database='Server=SERVIDOR;Database=GestorInventarioDB;User Id=USUARIO;Password=CLAVE;Encrypt=True;TrustServerCertificate=True'
```

## Ejecutar

Abra una terminal dentro de `backend/` y ejecute el comando correspondiente:

```bash
# macOS, Linux o Git Bash
./run.sh

# Windows CMD
run.cmd

# Windows PowerShell
.\run.ps1
```

El comando valida que exista .NET SDK 10 y utiliza el perfil `http`, configurado en `http://localhost:5100`. Es equivalente a ejecutar manualmente:

```bash
dotnet run --project src/Agaval.Inventory.Api --launch-profile http
```

En Development, la API detecta y aplica automáticamente las migraciones pendientes. Una base nueva recibe las tablas, categorías y productos demostrativos incluidos en el seed.

- API: `http://localhost:5100`
- Swagger: `http://localhost:5100/swagger`
- Health check: `http://localhost:5100/health`

## Autenticación y permisos

Productos, categorías y movimientos exigen un JWT válido incluso para consultas. Crear, modificar, eliminar o ajustar stock exige además el rol `InventoryManager`. Solo `POST /api/autenticacion/login` y `/health` permanecen anónimos.

Credenciales incluidas en Development para la evaluación:

```text
Usuario: admin
Contraseña: Agaval_admin_2026!
Rol: InventoryManager
```

Todas las opciones se pueden reemplazar con variables `Authentication__*`.

## Contrato adicional

- `GET /api/productos`: búsqueda, filtros, orden y paginación server-side.
- `GET /api/productos/resumen`: métricas globales sin depender de la página actual.
- `GET /api/movimientos-inventario`: historial paginado por producto y tipo.
- `GET/POST/PUT/DELETE /api/categorias`: administración completa; DELETE elimina físicamente una categoría sin productos y responde 409 si está en uso.
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

Resultados de la última verificación: 17 pruebas aprobadas (8 Domain, 5 Application y 4 funcionales), incluidas consultas protegidas, autenticación, CRUD físico de categorías con integridad referencial, paginación, historial y el ciclo HTTP de productos; build Release sin warnings ni errores.
