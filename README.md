# AGAVAL — Gestor de Inventario

Solución full stack de la prueba técnica: API REST en .NET 10 con Clean Architecture, CQRS, FluentValidation y SQL Server; cliente Angular 20 standalone, zoneless y basado en Signals.

## Funcionalidad

- CRUD completo de productos y categorías.
- Búsqueda, filtros, ordenamiento y paginación ejecutados en SQL Server.
- Consulta de productos con stock bajo.
- Entradas y salidas de inventario con historial persistente.
- Autenticación JWT obligatoria y autorización por rol para escrituras.
- Migraciones y datos demostrativos aplicados automáticamente en Development.
- Pruebas unitarias, funcionales y E2E en integración continua.

## Estructura

```text
Agaval/
├── backend/                 API .NET 10, CQRS, EF Core y SQL Server
├── frontend/                Angular 20 y Angular Material
├── infra/                   Kubernetes y Azure Bicep
├── scripts/                 prueba E2E del sistema
└── docker-compose.yml       infraestructura reproducible para CI
```

## Requisitos locales

- .NET SDK 10.
- Node.js compatible con Angular 20: 20.19+, 22.12+ o 24.x, con npm.
- SQL Server LocalDB en Windows o una instancia SQL Server accesible.

La ejecución normal se hace desde dos terminales, una dentro de `backend/` y otra dentro de `frontend/`. No existe un launcher general en la raíz.

## 1. Preparar SQL Server

En Windows, la configuración Development usa por defecto:

```text
Server=(localdb)\MSSQLLocalDB;Database=GestorInventarioDB;Trusted_Connection=True;TrustServerCertificate=True;
```

Si usa SQL Server instalado, remoto o en contenedor, configure la conexión antes de iniciar el backend.

macOS, Linux o Git Bash:

```bash
export ConnectionStrings__Database='Server=localhost,1433;Database=GestorInventarioDB;User Id=sa;Password=SU_CLAVE;Encrypt=True;TrustServerCertificate=True'
```

Windows PowerShell:

```powershell
$env:ConnectionStrings__Database='Server=localhost,1433;Database=GestorInventarioDB;User Id=sa;Password=SU_CLAVE;Encrypt=True;TrustServerCertificate=True'
```

Opcionalmente puede iniciar solamente el SQL Server incluido en Compose:

```bash
docker compose up --detach sqlserver
```

Al arrancar, la API crea la base si hace falta, aplica las migraciones pendientes y carga el seed de demostración de forma idempotente.

## 2. Iniciar el backend

Abra una terminal en la carpeta `backend/`:

```bash
cd backend
```

macOS, Linux o Git Bash:

```bash
./run.sh
```

Windows CMD:

```bat
run.cmd
```

Windows PowerShell:

```powershell
.\run.ps1
```

El comando valida .NET 10 y levanta la API con el perfil `http`:

- API: `http://localhost:5100`
- Swagger: `http://localhost:5100/swagger`
- Health check: `http://localhost:5100/health`

## 3. Iniciar el frontend

Abra una segunda terminal en la carpeta `frontend/`:

```bash
cd frontend
npm ci
npm start
```

`npm ci` es necesario la primera vez o cuando cambie `package-lock.json`. Después puede usar solamente `npm start`.

El frontend queda disponible en `http://localhost:4200`. Su proxy de desarrollo envía las peticiones `/api` a `http://localhost:5100`.

## Credenciales de evaluación para el revisor

Después de iniciar ambos proyectos, abra `http://localhost:4200/login` e ingrese con:

```text
Usuario: admin
Contraseña: Agaval_admin_2026!
```

Estas credenciales son exclusivamente locales y permiten revisar todos los flujos protegidos. Todas las rutas del inventario exigen una sesión válida; solo el login del frontend, `POST /api/autenticacion/login` y `/health` son públicos.

## Variables relevantes

La configuración del backend puede reemplazarse con variables estándar de ASP.NET Core:

- `ConnectionStrings__Database`
- `Database__ApplyMigrationsOnStartup`
- `Authentication__Issuer`
- `Authentication__Audience`
- `Authentication__SigningKey`
- `Authentication__Username`
- `Authentication__Password`
- `Authentication__Role`
- `Authentication__TokenLifetimeMinutes`

El archivo `.env` de la raíz se utiliza por Docker Compose y por los workflows de infraestructura; los comandos dentro de `backend/` y `frontend/` no dependen de un launcher que lo traduzca.

## Verificación

Backend:

```bash
cd backend
dotnet restore Agaval.Inventory.slnx
dotnet format Agaval.Inventory.slnx --verify-no-changes --no-restore
dotnet build Agaval.Inventory.slnx --configuration Release --no-restore
dotnet test Agaval.Inventory.slnx --configuration Release --no-build
```

Frontend:

```bash
cd frontend
npm ci
npm run lint
npm test -- --watch=false --browsers=ChromeHeadless
npm run build
```

El smoke E2E puede ejecutarse cuando ambos proyectos y SQL Server están activos:

```bash
node scripts/e2e-smoke.mjs http://localhost:5100 http://localhost:4200
```

Las peticiones HTTP de ejemplo están en `backend/src/Agaval.Inventory.Api/Agaval.Inventory.Api.http`.
