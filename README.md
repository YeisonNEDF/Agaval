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

## Cuestionario técnico resuelto

Esta sección responde las siete preguntas conceptuales de la sección 4 de la prueba y forma parte de los entregables definidos en su sección 5.

### Backend

#### 1. ¿Por qué `ProductosController` no debe acceder directamente al `PersistenceContext`?

El controlador pertenece a la capa de presentación: su responsabilidad es recibir HTTP, validar el contrato de entrada y traducir el resultado a una respuesta. Al enviar un Command o Query mediante MediatR, el caso de uso queda en Application y puede reutilizarse desde HTTP, un worker, una CLI o una prueba sin duplicar comportamiento.

Esta separación aporta inversión de dependencias, responsabilidad única y testabilidad. Application depende de abstracciones, no de EF Core; por ello sus pruebas pueden sustituir repositorios sin levantar SQL Server. También permite centralizar validación, logging y transacciones mediante pipeline behaviors. Usar el `DbContext` directamente parece más corto, pero acopla HTTP, reglas de negocio y persistencia, haciendo más costoso probar, mantener o sustituir la tecnología de datos.

#### 2. ¿Por qué el correo por stock bajo no debe enviarse directamente desde `CrearProductoCommandHandler`?

Enviar un correo es un efecto externo diferente de persistir el producto. Incluirlo en el mismo Handler viola responsabilidad única, acopla el caso de uso a un proveedor y deja una transacción ambigua: si el producto se guarda y el correo falla, no queda claro si se debe devolver error, reintentar o crear nuevamente el producto.

La alternativa es publicar un evento de dominio o integración, por ejemplo `ProductCreatedWithLowStock`, y procesarlo en un Handler independiente que encole la notificación. Para garantizar confiabilidad se puede aplicar Outbox: el producto y el evento se confirman en la misma transacción, mientras un worker publica y reintenta el correo de forma idempotente. La decisión se sustenta en SRP, Open/Closed e inversión de dependencias, separando consistencia transaccional de consistencia eventual.

### Frontend

#### 1. ¿Por qué componentes standalone en lugar de NgModules y qué ventaja ofrecen al lazy loading?

Los componentes standalone hacen explícitas sus dependencias y eliminan módulos utilizados únicamente como contenedores de registro. Esto reduce configuración accidental, favorece el tree shaking y permite importar directamente componentes, pipes y providers donde realmente se necesitan.

En lazy loading, una ruta puede cargar una feature o componente con `loadChildren` o `loadComponent` sin introducir un NgModule intermedio. El límite del chunk coincide con la ruta y sus dependencias reales, y los providers pueden quedar limitados a ese scope. El resultado es un grafo de compilación más simple y una propiedad más clara del estado de cada feature.

#### 2. ¿Por qué `ChangeDetectionStrategy.OnPush` y qué implica al actualizar datos?

`OnPush` evita revisar indiscriminadamente todo el árbol en cada ciclo. Un componente se actualiza cuando cambia un input por referencia, ocurre un evento propio, una fuente reactiva notifica o se solicita detección explícita. Con Signals y ejecución zoneless, el template registra los Signals consumidos y Angular actualiza únicamente sus consumidores.

La consecuencia práctica es tratar el estado como inmutable y observable. No se debe mutar silenciosamente un array u objeto conservando la misma referencia; se utiliza `signal.set`, `signal.update`, `computed` o un nuevo valor de input. Una operación asíncrona debe publicar su resultado mediante el mecanismo reactivo correspondiente.

### CI/CD, Docker y Kubernetes

#### 1. ¿Por qué versionar los recursos de Kubernetes en YAML en lugar de crearlos manualmente?

Los manifiestos convierten la infraestructura en código: permiten revisión por pull request, historial, comparación entre ambientes, repetibilidad y automatización. El estado deseado se aplica de forma declarativa e idempotente y se audita junto con la versión de la aplicación.

Crear recursos manualmente con `kubectl create` deja conocimiento en la terminal de una persona, favorece el configuration drift y dificulta reconstruir el clúster o explicar cambios de réplicas, probes y límites. Los secretos reales permanecen fuera de Git; los manifiestos solamente referencian Secrets administrados por la plataforma.

#### 2. ¿Por qué usar una imagen Docker en lugar de desplegar el artefacto compilado en una VM?

Una imagen empaqueta el artefacto, el runtime, las dependencias del sistema y la configuración base en una unidad inmutable. El mismo digest probado en CI se ejecuta en staging y producción, reduciendo la deriva entre servidores y el problema de “funciona en mi máquina”.

También facilita rollback, aislamiento, escalado y scheduling. Containerizar no elimina la configuración externa ni la observabilidad, pero fija el entorno de ejecución. Copiar solamente un binario a una VM depende de que cada servidor tenga exactamente el runtime, las librerías y la configuración esperados.

#### 3. ¿Por qué separar Build de Release/Deploy?

Build debe producir una sola vez un artefacto inmutable, ejecutar análisis y pruebas y publicar su digest. Release toma exactamente ese artefacto aprobado y lo promueve sin recompilar. La separación permite aprobaciones, controles por ambiente, ventanas de despliegue y rollback a una versión conocida.

Esto evita que una compilación no verificada llegue a producción o que el artefacto desplegado sea diferente del probado. También reduce privilegios: Build no necesita credenciales del clúster y Deploy puede utilizar permisos mínimos protegidos por ambiente. Un único job que compila y despliega amplía el impacto de un fallo o compromiso.

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
