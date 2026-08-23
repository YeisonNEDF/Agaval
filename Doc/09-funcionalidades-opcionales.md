# 09. Funcionalidades opcionales completadas

## Resultado

La sección marcada como opcional/no requerida en la prueba se implementó completa, sin mezclar responsabilidades con la feature original de productos.

| Requisito | Backend | Frontend | Verificación |
| --- | --- | --- | --- |
| CRUD de categorías | CQRS, repositorio, validación y endpoints | feature lazy propia | prueba funcional de ciclo y conflicto |
| Movimientos | consulta paginada de la tabla existente | filtros, tabla y paginador | ajuste de stock seguido de consulta |
| Autenticación/autorización | JWT Bearer y política por rol | store, guard, interceptor y login | 401, credencial inválida y token válido |
| Paginación avanzada | filtros/orden/conteo/`Skip`/`Take` en SQL | URL, `MatSort` y `MatPaginator` | prueba HTTP y specs de componentes |
| Pruebas | dominio, Application y HTTP | servicios, interceptor, rutas y UI | 17 .NET + 26 Angular |
| Cloud | Container Apps, ACR y Azure SQL | Nginx como frontend/proxy | Bicep validado y workflow de verificación |

## Estructura respetada

### Backend

Cada intención está en un vertical slice y las dependencias continúan apuntando hacia el dominio:

```text
backend/src/
├── Agaval.Inventory.Domain/
│   └── Entities/Category.cs
├── Agaval.Inventory.Application/
│   ├── Abstractions/
│   │   ├── Authentication/IIdentityService.cs
│   │   └── Persistence/IInventoryMovementRepository.cs
│   ├── Common/Models/PagedResult.cs
│   └── Features/
│       ├── Authentication/Login/
│       ├── Categories/{Create,Delete,GetById,GetList,Update}/
│       ├── InventoryMovements/GetList/
│       └── Products/{GetList,GetSummary}/
├── Agaval.Inventory.Infrastructure/
│   ├── Authentication/
│   └── Persistence/Repositories/
└── Agaval.Inventory.Api/
    ├── Contracts/{Authentication,Categories}/
    ├── Controllers/
    └── Infrastructure/AuthorizationPolicies.cs
```

- Domain normaliza categorías y mantiene la baja lógica como comportamiento.
- Application declara mensajes, validators, handlers y puertos; no conoce JWT, EF Core ni ASP.NET.
- Infrastructure implementa consultas SQL y la emisión criptográfica del token.
- API traduce HTTP, configura autenticación/autorización y serializa Problem Details.

### Frontend

No se crearon componentes monolíticos. Cada feature mantiene sus contratos, acceso HTTP, estado, componentes y página:

```text
frontend/src/app/
├── core/
│   ├── authentication/
│   │   ├── authentication-api.service.ts
│   │   ├── authentication.guard.ts
│   │   ├── authentication.model.ts
│   │   └── authentication.store.ts
│   └── interceptors/auth-token.interceptor.ts
├── shared/models/paged-result.model.ts
└── features/
    ├── authentication/pages/login-page/
    ├── categories/
    │   ├── components/{category-form,category-list}/
    │   ├── models/
    │   ├── pages/categories-page/
    │   ├── services/
    │   └── routes.ts
    ├── inventory-movements/
    │   ├── components/{movement-filters,movement-list}/
    │   ├── models/
    │   ├── pages/inventory-movements-page/
    │   ├── services/
    │   └── routes.ts
    └── products/
        ├── components/
        ├── models/
        ├── pages/
        ├── services/
        └── routes.ts
```

Los componentes visuales conservan `.ts`, `.html`, `.scss` y, cuando contienen comportamiento relevante, `.spec.ts`. Los stores coordinan estado; los servicios encapsulan HTTP; las pages orquestan; los componentes presentan y emiten intenciones.

## 1. CRUD de categorías

### Flujo backend

1. `CategoriesController` crea el Command/Query.
2. `ValidationBehavior` ejecuta FluentValidation.
3. el Handler comprueba existencia o unicidad mediante `ICategoryRepository`;
4. `Category` normaliza nombre/estado;
5. `IUnitOfWork` confirma la operación.

Rutas:

| Método | Ruta | Seguridad | Resultado |
| --- | --- | --- | --- |
| `GET` | `/api/categorias` | pública | activas; acepta `incluirInactivas=true` |
| `GET` | `/api/categorias/{id}` | pública | detalle incluso inactivo |
| `POST` | `/api/categorias` | `InventoryWrite` | 201 o 409 si el nombre existe |
| `PUT` | `/api/categorias/{id}` | `InventoryWrite` | cambia nombre y estado |
| `DELETE` | `/api/categorias/{id}` | `InventoryWrite` | 204 y baja lógica |

La baja es lógica porque una eliminación física podría romper productos existentes. Reactivar se realiza mediante `PUT` con `isActive: true`.

### Flujo frontend

`CategoriesPageComponent` coordina el dialog y el store. `CategoryFormComponent` solo conoce el formulario tipado. `CategoryListComponent` recibe filas y emite editar/desactivar/reactivar. La ruta `/categorias` se carga de forma lazy y el guard devuelve al login conservando la URL de retorno.

## 2. Historial de movimientos

El ajuste de stock ya generaba `MovimientosInventario` dentro de la misma unidad de trabajo. El extra agrega una consulta independiente, sin permitir editar auditoría:

```text
GET /api/movimientos-inventario
    ?productoId=1
    &tipo=Entry
    &pagina=1
    &tamanoPagina=10
```

`InventoryMovementRepository` usa `AsNoTracking`, incluye el producto, filtra y ordena por fecha descendente antes de paginar. Angular muestra producto, tipo, cantidad, fecha y observación en `/movimientos`; filtros y paginador modifican el query del store.

## 3. Autenticación y autorización

### Contrato

```http
POST /api/autenticacion/login
Content-Type: application/json

{
  "username": "admin",
  "password": "Agaval_admin_2026!"
}
```

La respuesta contiene `accessToken`, `tokenType`, `expiresAt`, `username` y `role`. El JWT HS256 valida firma, issuer, audience y expiración con un margen máximo de 30 segundos. Las credenciales se comparan en tiempo constante.

Las lecturas son públicas. Los `POST`, `PUT`, `DELETE` y ajustes de stock requieren el rol configurado en la política `InventoryWrite`. Swagger declara el esquema Bearer para probar el contrato en Development.

Angular persiste la sesión únicamente en `sessionStorage` (no entre cierres completos del navegador), programa su expiración y adjunta el token solo a `/api`. Un 401 elimina la sesión. Para producción, `IIdentityService` permite reemplazar la identidad local por OIDC/Entra ID sin trasladar esa dependencia a Application.

Variables:

```dotenv
AUTH_ISSUER=Agaval.Inventory.Api
AUTH_AUDIENCE=Agaval.Inventory.Frontend
AUTH_JWT_SIGNING_KEY=Agaval-development-signing-key-2026-change-me
AUTH_USERNAME=admin
AUTH_PASSWORD=Agaval_admin_2026!
AUTH_ROLE=InventoryManager
AUTH_TOKEN_LIFETIME_MINUTES=120
```

## 4. Paginación, búsqueda y orden

`GET /api/productos` acepta:

- `categoriaId`: identificador opcional;
- `stock`: `All`, `Low` o `Normal`;
- `buscar`: coincidencia en nombre o descripción;
- `pagina`: desde 1;
- `tamanoPagina`: entre 1 y 100;
- `ordenarPor`: `Name`, `Category`, `Price`, `Stock` o `CreatedAt`;
- `direccion`: `Ascending` o `Descending`.

Respuesta estándar:

```json
{
  "items": [],
  "pageNumber": 1,
  "pageSize": 10,
  "totalCount": 0,
  "totalPages": 0,
  "hasPreviousPage": false,
  "hasNextPage": false
}
```

EF Core calcula primero el total y después aplica un orden determinista, `Skip` y `Take`. Angular refleja todos los parámetros relevantes en la URL, reinicia a la primera página al cambiar filtros y conecta `MatSort`/`MatPaginator` con el backend. `GET /api/productos/resumen` evita calcular métricas globales sobre una página parcial.

## 5. Pruebas agregadas

Backend:

- `CategoryTests`: normalización, actualización, desactivación y nombre inválido;
- `AuthenticationEndpointsTests`: 401 y JWT válido;
- `CategoriesEndpointsTests`: permiso, ciclo completo y conflicto 409;
- `ProductsEndpointsTests`: permiso, página/búsqueda/orden, resumen y movimiento.

Frontend:

- interceptor de token;
- servicio y lista de categorías;
- servicio y lista de movimientos;
- disponibilidad/lazy loading de rutas opcionales;
- adaptación de las pruebas de productos a paginación y permisos.

Comandos de evidencia:

```bash
cd backend
dotnet format Agaval.Inventory.slnx --verify-no-changes --no-restore
dotnet build Agaval.Inventory.slnx --configuration Release
dotnet test Agaval.Inventory.slnx --configuration Release --no-build

cd ../frontend
npm run lint
npm test -- --watch=false --browsers=ChromeHeadless
npm run build
npm audit
```

Resultado actual: 17/17 pruebas .NET y 26/26 specs Angular, compilaciones exitosas, lint limpio, cero advertencias .NET, cero vulnerabilidades npm y modelo EF sin cambios pendientes.

## 6. Despliegue Azure preparado

### Recursos

`infra/azure/foundation.bicep` declara:

- Azure Container Registry Basic sin usuario administrador;
- identidad administrada con rol `AcrPull`;
- Log Analytics y Container Apps Environment;
- Azure SQL Server con TLS 1.2 y base Basic de 2 GB.

`infra/azure/apps.bicep` declara:

- API interna, accesible únicamente por el frontend;
- frontend Nginx público por HTTPS y proxy `/api`;
- secretos de conexión SQL, firma JWT y password de login;
- probes y límites de CPU/memoria;
- una réplica de API durante la migración automática de esta evaluación.

### Workflow

`.github/workflows/deploy-azure.yml` se ejecuta manualmente (`workflow_dispatch`) y:

1. autentica GitHub con Azure mediante OIDC, sin secreto de cliente;
2. crea/actualiza el resource group;
3. despliega infraestructura Bicep;
4. construye y publica imágenes etiquetadas con `GITHUB_SHA`;
5. despliega las dos Container Apps;
6. espera y verifica frontend `/health` y `/api/productos`;
7. publica la URL en el resumen del workflow.

El environment de GitHub se llama `production` y requiere estos secrets:

```text
AZURE_CLIENT_ID
AZURE_TENANT_ID
AZURE_SUBSCRIPTION_ID
AZURE_SQL_ADMIN_PASSWORD
AUTH_PASSWORD
AUTH_JWT_SIGNING_KEY
```

La variable opcional `AUTH_USERNAME` cambia el usuario de evaluación. La identidad Azure asociada a OIDC necesita permisos para administrar el resource group y asignar `AcrPull`.

No se desplegó contra una cuenta real porque no se recibieron suscripción ni autorización para crear recursos facturables. El código de infraestructura sí fue validado. Tras una demo, el propietario puede eliminar todos los recursos de forma explícita con:

```bash
az group delete --name agaval-evaluation-rg
```

Ese comando es destructivo y nunca lo ejecutan los scripts del repositorio.

## Límites honestos para entrevista

- La identidad configurable demuestra JWT/políticas, pero no sustituye un directorio real de usuarios.
- El almacenamiento de sesión en navegador tiene el riesgo normal de XSS; CSP, OIDC con Authorization Code + PKCE y cookies seguras serían la evolución productiva.
- La migración automática de Azure se limita a una réplica para la evaluación. Un sistema real ejecutaría un migration bundle/job antes de escalar.
- La regla de firewall `AllowAzureServices` simplifica la prueba. Producción debe usar red privada/Private Endpoint.
- El despliegue genera costo Azure hasta eliminar el resource group.

Referencias oficiales usadas para la automatización: [GitHub Actions para Azure Container Apps](https://learn.microsoft.com/en-us/azure/container-apps/github-actions), [recurso Bicep de Container Apps](https://learn.microsoft.com/en-us/azure/templates/microsoft.app/containerapps) y [recurso Bicep de Azure SQL Database](https://learn.microsoft.com/en-us/azure/templates/microsoft.sql/servers/databases).
