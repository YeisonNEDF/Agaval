# AGAVAL — Gestor de Inventario

Solución full stack de la prueba técnica: API REST en .NET 10 con Clean Architecture, CQRS, FluentValidation y SQL Server; cliente Angular 20 standalone, zoneless y basado en Signals.

## Funcionalidad incluida

- CRUD completo de productos.
- Categorías activas precargadas y selección desde el formulario.
- Filtros por categoría y estado de stock.
- Consulta específica de productos con stock bajo.
- Entradas y salidas de inventario con historial persistente.
- Validación de dominio, FluentValidation y formularios tipados.
- Problem Details, Swagger, health check, pruebas automatizadas y pipeline CI.
- Migración/seed automático en desarrollo, Docker Compose y recursos Kubernetes.

## Estructura

```text
Agaval/
├── backend/                 .NET 10, CQRS, EF Core y SQL Server
├── frontend/                Angular 20 y Angular Material
├── Doc/                     análisis y documentación técnica
├── infra/k8s/               recursos declarativos de Kubernetes
├── .github/workflows/       integración continua
└── docker-compose.yml       aplicación + SQL Server local
```

## Opción recomendada: ejecutar todo con Docker

### Requisito único

Solo se necesita Docker con el complemento Compose:

- macOS y Windows: [Docker Desktop](https://docs.docker.com/get-started/get-docker/).
- Linux: [Docker Engine](https://docs.docker.com/engine/install/) y el plugin Docker Compose.

No es necesario instalar .NET, Node.js, npm ni SQL Server en la máquina. Después de instalar Docker, SQL Server, la API y el frontend se levantan juntos con un solo comando:

> La imagen oficial de SQL Server es x86-64. En Apple Silicon, Compose solicita `linux/amd64`; Docker Desktop puede emularla, pero será más lenta y Microsoft no considera ese modo una plataforma soportada. Si falla, use una instancia SQL Server remota o una máquina x86-64.

```bash
./start.sh
```

El script crea `.env` desde `.env.example` cuando hace falta, valida Docker Compose, construye los contenedores y espera a que API y frontend respondan. Comandos adicionales:

```bash
./start.sh --logs        # seguir logs
./start.sh --status      # consultar estado
./start.sh --stop        # detener sin borrar la base
./start.sh --foreground  # ejecutar en primer plano
./start.sh --no-build    # reutilizar imágenes existentes
```

### Configuración completa

`.env.example` contiene todos los valores necesarios y funciona sin modificaciones. En el primer inicio se copia automáticamente como `.env`:

| Variable | Predeterminado | Uso |
| --- | --- | --- |
| `COMPOSE_PROJECT_NAME` | `agaval` | Agrupa contenedores, red y volumen. |
| `FRONTEND_PORT` | `4200` | Puerto público de Angular/Nginx. |
| `BACKEND_PORT` | `5100` | Puerto público de la API. |
| `SQLSERVER_PORT` | `1433` | Puerto público de SQL Server. |
| `SQLSERVER_IMAGE` | SQL Server 2022 | Imagen oficial de la base. |
| `SQLSERVER_PLATFORM` | `linux/amd64` | Arquitectura requerida por SQL Server. |
| `MSSQL_PID` | `Developer` | Edición gratuita para desarrollo. |
| `MSSQL_SA_PASSWORD` | clave local de ejemplo | Credencial exclusiva del entorno local. |
| `DATABASE_NAME` | `GestorInventarioDB` | Base creada por las migraciones. |
| `ASPNETCORE_ENVIRONMENT` | `Production` | Entorno de ejecución de la API. |
| `APPLY_MIGRATIONS_ON_STARTUP` | `true` | Crea esquema y seed automáticamente. |
| `PUBLIC_HOST` | `localhost` | Host mostrado al finalizar el inicio. |

Para cambiar un puerto o contraseña solo hay que editar `.env`. Ese archivo es local y no se versiona; `.env.example` es la plantilla pública reproducible.

- Frontend: `http://localhost:4200`
- API: `http://localhost:5100`
- SQL Server: `localhost:1433`

La API espera a que SQL Server esté saludable. Después ejecuta `MigrateAsync`: si `GestorInventarioDB` no existe, la crea; aplica las migraciones pendientes y carga categorías y productos de demostración. Las siguientes ejecuciones son idempotentes gracias a `__EFMigrationsHistory`.

Para reiniciar completamente los datos locales:

```bash
docker compose down --volumes
docker compose up --build
```

`docker compose down --volumes` elimina el volumen SQL Server de este proyecto y todos sus datos locales.

## Ejecución sin Docker

### Requisitos

- .NET SDK 10.
- Node.js 20 LTS y npm 10 o superior.
- SQL Server 2022 accesible en `localhost:1433` o una conexión equivalente.
- Chrome o Chromium para los tests del frontend.

La configuración Development incluida espera:

```text
Server=localhost,1433;Database=GestorInventarioDB;User Id=sa;Password=Agaval_local_2026!;Encrypt=True;TrustServerCertificate=True
```

Puede reemplazarla sin editar archivos:

```bash
export ConnectionStrings__Database='Server=SERVIDOR;Database=GestorInventarioDB;User Id=USUARIO;Password=CLAVE;Encrypt=True;TrustServerCertificate=True'
```

### Backend

```bash
cd backend
dotnet restore Agaval.Inventory.slnx
dotnet run --project src/Agaval.Inventory.Api --launch-profile http
```

En Development, `Database:ApplyMigrationsOnStartup` está activo. No hace falta crear manualmente la base ni ejecutar el SQL.

Aplicación manual opcional:

```bash
cd backend
dotnet tool restore
dotnet ef database update \
  --project src/Agaval.Inventory.Infrastructure \
  --startup-project src/Agaval.Inventory.Api
```

[`backend/database/initial.sql`](backend/database/initial.sql) contiene además el script SQL Server idempotente generado por EF Core.

### Frontend

```bash
cd frontend
npm ci
npm start
```

Abra `http://localhost:4200`. Angular CLI redirige `/api` hacia `http://localhost:5100` mediante `proxy.conf.json`.

## Verificación

```bash
# Backend
cd backend
dotnet format Agaval.Inventory.slnx --verify-no-changes --no-restore
dotnet build Agaval.Inventory.slnx --configuration Release
dotnet test Agaval.Inventory.slnx --configuration Release --no-build

# Frontend
cd frontend
npm run lint
npm test -- --watch=false --browsers=ChromeHeadless
npm run build
```

Las peticiones de ejemplo están en [`backend/src/Agaval.Inventory.Api/Agaval.Inventory.Api.http`](backend/src/Agaval.Inventory.Api/Agaval.Inventory.Api.http).

## Política por ambiente

- **Development:** migración y seed automáticos.
- **Docker Compose local:** migración y seed automáticos con una única API.
- **Production/Kubernetes:** migración automática deshabilitada. El release debe ejecutar el script o migration bundle una sola vez con una identidad autorizada.

Si una base está parcialmente dañada —por ejemplo, se borró una tabla pero se dejó `__EFMigrationsHistory`— la aplicación no intenta repararla destruyendo datos. Ese escenario requiere restauración o intervención controlada.

## Documentación

- [`Doc/00-analisis-prueba.md`](Doc/00-analisis-prueba.md): análisis y auditoría de contenido oculto.
- [`Doc/01-arquitectura.md`](Doc/01-arquitectura.md): arquitectura y decisiones.
- [`Doc/02-backend.md`](Doc/02-backend.md): explicación del backend.
- [`Doc/03-frontend.md`](Doc/03-frontend.md): explicación del frontend.
- [`Doc/04-base-de-datos-sql-server.md`](Doc/04-base-de-datos-sql-server.md): inicialización de SQL Server.
- [`Doc/05-cuestionario-tecnico.md`](Doc/05-cuestionario-tecnico.md): respuestas conceptuales.
- [`Doc/06-pruebas-y-calidad.md`](Doc/06-pruebas-y-calidad.md): evidencia de calidad.
