# AGAVAL — Gestor de Inventario

Solución full stack de la prueba técnica: API REST en .NET 10 con Clean Architecture y CQRS, y cliente Angular 20 standalone, zoneless y basado en Signals.

## Funcionalidad incluida

- CRUD completo de productos.
- Categorías activas precargadas y selección desde el formulario.
- Filtros por categoría y estado de stock.
- Consulta específica de productos con stock bajo.
- Entradas y salidas de inventario con historial persistente.
- Validación de dominio, de casos de uso y de formularios.
- Problem Details, Swagger, health check, pruebas automatizadas y pipeline CI.
- Contenedores Docker y manifiestos base de Kubernetes.

## Estructura

```text
Agaval/
├── backend/                 .NET 10, EF Core, PostgreSQL y CQRS
├── frontend/                Angular 20 y Angular Material
├── Doc/                     análisis y documentación técnica
├── infra/k8s/               recursos declarativos de Kubernetes
├── .github/workflows/       integración continua
└── docker-compose.yml       ejecución containerizada
```

La documentación detallada comienza en [`Doc/00-analisis-prueba.md`](Doc/00-analisis-prueba.md).

## Requisitos locales

- .NET SDK 10.
- Node.js 20 LTS y npm 10 o superior.
- Una base PostgreSQL de Supabase.
- Chrome o Chromium para ejecutar los tests del frontend.

## 1. Configurar Supabase

Desde **Project settings > Database**, copie una cadena de conexión directa o del pooler en modo sesión. Para ejecutar migraciones no use el pooler en modo transacción.

```bash
cd backend
export ConnectionStrings__Database='Host=HOST;Port=5432;Database=postgres;Username=USUARIO;Password=CLAVE;SSL Mode=Require;Trust Server Certificate=true'
dotnet tool restore
dotnet ef database update \
  --project src/Agaval.Inventory.Infrastructure \
  --startup-project src/Agaval.Inventory.Api
```

Como alternativa, [`backend/database/initial.sql`](backend/database/initial.sql) contiene el script PostgreSQL idempotente generado a partir de la migración.

> No se almacenan credenciales en el repositorio. `.env.example` solo contiene un patrón de referencia.

## 2. Ejecutar el backend

```bash
cd backend
dotnet restore Agaval.Inventory.slnx
dotnet run --project src/Agaval.Inventory.Api --launch-profile http
```

- API: `http://localhost:5100`
- Swagger: `http://localhost:5100/swagger`
- Health check: `http://localhost:5100/health`

Las peticiones de ejemplo están en [`backend/src/Agaval.Inventory.Api/Agaval.Inventory.Api.http`](backend/src/Agaval.Inventory.Api/Agaval.Inventory.Api.http).

## 3. Ejecutar el frontend

```bash
cd frontend
npm ci
npm start
```

Abra `http://localhost:4200`. El servidor de desarrollo redirige `/api` hacia `http://localhost:5100` mediante `proxy.conf.json`.

## Verificación

```bash
# Backend
cd backend
dotnet build Agaval.Inventory.slnx --configuration Release
dotnet test Agaval.Inventory.slnx --configuration Release --no-build

# Frontend
cd frontend
npm run lint
npm test -- --watch=false --browsers=ChromeHeadless
npm run build
```

## Docker Compose

```bash
cp .env.example .env
# Reemplace AGAVAL_DATABASE_CONNECTION en .env
docker compose up --build
```

El frontend queda en `http://localhost:4200` y la API en `http://localhost:5100`. La migración debe aplicarse previamente; no se ejecuta automáticamente al levantar réplicas.

## Decisiones de alcance

La gestión de categorías y la autenticación no se implementaron porque el enunciado las clasifica como opcionales. Sí se incluyeron los pluses de movimientos de inventario, pruebas, Docker, Kubernetes y CI. El proveedor SQL Server del texto se sustituyó únicamente en Infrastructure por PostgreSQL/Npgsql para cumplir la decisión de usar Supabase; el dominio y los casos de uso permanecen independientes del motor.

## Documentación

- [`Doc/00-analisis-prueba.md`](Doc/00-analisis-prueba.md): análisis del enunciado y auditoría de contenido oculto.
- [`Doc/01-arquitectura.md`](Doc/01-arquitectura.md): arquitectura y decisiones.
- [`Doc/02-backend.md`](Doc/02-backend.md): explicación del backend por fragmentos y archivos.
- [`Doc/03-frontend.md`](Doc/03-frontend.md): explicación del frontend por responsabilidades.
- [`Doc/04-base-de-datos-supabase.md`](Doc/04-base-de-datos-supabase.md): conexión y migraciones.
- [`Doc/05-cuestionario-tecnico.md`](Doc/05-cuestionario-tecnico.md): respuestas conceptuales.
- [`Doc/06-pruebas-y-calidad.md`](Doc/06-pruebas-y-calidad.md): estrategia y evidencia de verificación.
