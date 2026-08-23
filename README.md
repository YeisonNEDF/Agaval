# AGAVAL — Gestor de Inventario

Solución full stack de la prueba técnica: API REST en .NET 10 con Clean Architecture, CQRS, FluentValidation y SQL Server; cliente Angular 20 standalone, zoneless y basado en Signals.

## Funcionalidad incluida

- CRUD completo de productos.
- CRUD completo de categorías con eliminación física protegida cuando existen productos asociados.
- Búsqueda, filtros, ordenamiento y paginación ejecutados en SQL Server.
- Consulta específica de productos con stock bajo.
- Entradas y salidas de inventario con historial persistente y pantalla paginada.
- Autenticación JWT obligatoria para consultar el inventario y autorización por rol para toda escritura.
- Validación de dominio, FluentValidation y formularios tipados.
- Problem Details, Swagger protegido, health check, 67 pruebas automatizadas y pipeline CI con E2E real.
- Migración/seed automático en desarrollo, Docker Compose, Kubernetes y despliegue Azure completamente automatizado.

## Estructura

```text
Agaval/
├── backend/                 .NET 10, CQRS, EF Core y SQL Server
├── frontend/                Angular 20 y Angular Material
├── Doc/                     análisis y documentación técnica
├── infra/k8s/               recursos declarativos de Kubernetes
├── infra/azure/             infraestructura Bicep para Azure
├── .github/workflows/       integración continua y despliegue manual
└── docker-compose.yml       aplicación + SQL Server local
```

## Inicio multiplataforma

El modo `Auto` detecta el sistema operativo y usa la opción más directa disponible:

1. carga o crea `.env` desde `.env.example`;
2. comprueba .NET 10, una versión de Node.js soportada por Angular 20 y una conexión SQL Server configurada;
3. si los tres requisitos nativos existen, ejecuta API y Angular directamente en el host;
4. si la ruta nativa no está completa, usa Docker Compose como entorno reproducible;
5. en Windows, si tampoco existe Docker, intenta instalar Docker Desktop con WinGet;
6. espera los health checks y muestra las URLs finales.

### macOS y Linux

```bash
chmod +x start.sh
./start.sh
```

### Windows

Desde el Explorador puede abrir `start.cmd`. Desde PowerShell:

```powershell
.\start.ps1 -Mode Auto
```

Windows usa automáticamente `(localdb)\MSSQLLocalDB` cuando SQL Server Express LocalDB está instalado. Si LocalDB, .NET 10 o Node.js no están disponibles, cambia a Docker Desktop.

Si `start.sh` se abre desde Git Bash en una ventana temporal y ocurre un error, la ventana espera Enter antes de cerrarse. El detalle completo queda guardado en `.run/launcher-error.log` para poder diagnosticarlo aunque la consola se haya cerrado.

El recorrido Windows de `start.sh` también se ejecuta en CI sobre un runner real: prepara .NET 10, Node 24 y LocalDB, inicia backend y frontend, y comprueba la API y el proxy de Angular antes de detenerlos.

Antes de iniciar, PowerShell muestra un diagnóstico por requisito. Si no existe ninguna ruta completa, instala con WinGet el software necesario que puede automatizarse (`Microsoft.DotNet.SDK.10`, `OpenJS.NodeJS.LTS` o `Docker.DockerDesktop`), vuelve a cargar el `PATH` y verifica otra vez. WinGet o el instalador pueden solicitar elevación. LocalDB se deja como selección explícita de SQL Server Express; el modo `Auto` instala Docker en su lugar para no adivinar opciones del motor de datos.

Para revisar el equipo sin instalar ni arrancar nada:

```powershell
.\start.ps1 -Check -NoInstall
```

### Selección explícita

| Objetivo | macOS/Linux/WSL | Windows PowerShell |
| --- | --- | --- |
| Detección automática | `./start.sh` | `.\start.ps1` |
| Forzar Docker | `./start.sh --mode docker` | `.\start.ps1 -Mode Docker` |
| Forzar ejecución nativa | `./start.sh --mode native` | `.\start.ps1 -Mode Native` |
| Diagnosticar sin iniciar | `./start.sh --check` | `.\start.ps1 -Check` |
| Desactivar auto-instalación | `./start.sh --no-install` | `.\start.ps1 -NoInstall` |
| Ver logs | `./start.sh --logs` | `.\start.ps1 -Logs` |
| Consultar estado | `./start.sh --status` | `.\start.ps1 -Status` |
| Detener sin borrar datos | `./start.sh --stop` | `.\start.ps1 -Stop` |

Los launchers guardan PID y logs nativos en `.run/`; esa carpeta no se versiona. En Docker, los datos persisten en el volumen `agaval_sqlserver-data`.

Al finalizar, todas las funcionalidades del inventario exigen una sesión válida. Use la cuenta local de evaluación:

```text
Usuario: admin
Contraseña: Agaval_admin_2026!
```

### Requisitos por modo

| Plataforma | Modo Docker | Modo nativo |
| --- | --- | --- |
| macOS Intel/Apple Silicon | Docker Desktop | .NET 10, Node 20.19+/22.12+/24.x y SQL Server remoto mediante `NATIVE_DATABASE_CONNECTION`. SQL Server no tiene motor nativo para macOS. |
| Windows 10/11 | Docker Desktop | .NET 10, Node 20.19+/22.12+/24.x y LocalDB o una conexión SQL Server explícita. |
| Linux x86-64 | Docker Engine + Compose | .NET 10, Node 20.19+/22.12+/24.x y SQL Server instalado/remoto. |
| WSL 2 | Docker Desktop con integración WSL | .NET 10, Node 20.19+/22.12+/24.x y una conexión SQL Server explícita. |

Docker evita instalar .NET, Node y SQL Server por separado. En macOS/Windows se instala desde [Docker Desktop](https://docs.docker.com/get-started/get-docker/); en Linux se usa [Docker Engine](https://docs.docker.com/engine/install/) con el plugin Compose.

> La imagen oficial de SQL Server es `linux/amd64`. Docker Desktop puede emularla en Apple Silicon para desarrollo —y esta solución fue verificada así—, pero Microsoft no soporta oficialmente SQL Server bajo emulación. Para una evaluación estrictamente soportada use Windows/x86-64, Linux x86-64 o un SQL Server remoto.

### Configuración completa

`.env.example` funciona sin modificaciones y se copia automáticamente como `.env`:

| Variable | Predeterminado | Uso |
| --- | --- | --- |
| `COMPOSE_PROJECT_NAME` | `agaval` | Agrupa contenedores, red y volumen. |
| `RUN_MODE` | `auto` | Selecciona `auto`, `docker` o `native`. |
| `FRONTEND_PORT` | `4200` | Puerto público del frontend. |
| `BACKEND_PORT` | `5100` | Puerto público de la API. |
| `SQLSERVER_PORT` | `1433` | Puerto público de SQL Server en Docker. |
| `SQLSERVER_IMAGE` | SQL Server 2022 | Imagen de base de datos. |
| `SQLSERVER_PLATFORM` | `linux/amd64` | Arquitectura publicada por SQL Server. |
| `MSSQL_PID` | `Developer` | Edición gratuita para desarrollo. |
| `MSSQL_SA_PASSWORD` | clave local de ejemplo | Credencial exclusiva del Compose local. |
| `DATABASE_NAME` | `GestorInventarioDB` | Base creada por las migraciones. |
| `ASPNETCORE_ENVIRONMENT` | `Production` | Entorno de la API dentro de Compose. |
| `APPLY_MIGRATIONS_ON_STARTUP` | `true` | Aplica migración y seed al iniciar. |
| `PUBLIC_HOST` | `localhost` | Host que se muestra al finalizar. |
| `NATIVE_DATABASE_CONNECTION` | vacío | Conexión necesaria para modo nativo fuera de LocalDB. |
| `AUTH_ISSUER` | `Agaval.Inventory.Api` | Emisor aceptado por JWT. |
| `AUTH_AUDIENCE` | `Agaval.Inventory.Frontend` | Audiencia aceptada por JWT. |
| `AUTH_JWT_SIGNING_KEY` | clave local de ejemplo | Firma HMAC del token; mínimo 32 caracteres. |
| `AUTH_USERNAME` / `AUTH_PASSWORD` | cuenta local de evaluación | Credenciales del único usuario configurable. |
| `AUTH_ROLE` | `InventoryManager` | Rol autorizado para escrituras. |
| `AUTH_TOKEN_LIFETIME_MINUTES` | `120` | Vigencia de la sesión. |

Ejemplo nativo para un SQL Server local/remoto:

```dotenv
RUN_MODE=native
NATIVE_DATABASE_CONNECTION=Server=localhost,1433;Database=GestorInventarioDB;User Id=sa;Password=SU_CLAVE;Encrypt=True;TrustServerCertificate=True
```

El repositorio incluye `.env` y `.env.example` con valores exclusivamente locales para que la evaluación sea inmediata, según la decisión de entrega. Para un ambiente real se deben reemplazar todas las credenciales y almacenarlas en secretos de la plataforma. La API ejecuta `MigrateAsync`, crea la base, aplica migraciones y carga datos de demostración de forma idempotente.

Para eliminar deliberadamente todos los datos Docker y empezar desde cero:

```bash
docker compose down --volumes
./start.sh --mode docker
```

La primera orden elimina el volumen SQL Server y no se ejecuta desde los launchers normales.

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

# E2E sobre el stack iniciado (API directa y proxy Angular/Nginx)
cd ..
node scripts/e2e-smoke.mjs http://localhost:5100 http://localhost:4200
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
- [`Doc/07-guia-entrevista-y-revision.md`](Doc/07-guia-entrevista-y-revision.md): recorrido, discurso y preguntas de revisión.
- [`Doc/08-ejecucion-multiplataforma.md`](Doc/08-ejecucion-multiplataforma.md): ejecución nativa/Docker y diagnóstico por sistema.
- [`Doc/09-funcionalidades-opcionales.md`](Doc/09-funcionalidades-opcionales.md): CRUD de categorías, historial, JWT, paginación, pruebas y Azure.
