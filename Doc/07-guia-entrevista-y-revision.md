# 07. Guía para entrevista y revisión de código

## Presentación en 30 segundos

AGAVAL es un gestor de inventario full stack construido con .NET 10, Angular 20 y SQL Server. El backend separa dominio, casos de uso, persistencia y transporte con Clean Architecture, CQRS, MediatR y FluentValidation. El frontend es standalone, zoneless, estricto y organizado por feature, con Signals para estado y componentes autocontenidos. La solución incluye CRUD de productos, categorías, filtros, alertas de stock bajo, movimientos de entrada/salida, migración y seed, pruebas, CI y arranque multiplataforma.

## Presentación en dos minutos

La decisión central fue proteger las reglas en más de una frontera, sin duplicar responsabilidades. El formulario ofrece validación inmediata al usuario; FluentValidation rechaza comandos o queries mal formados antes de ejecutar un Handler; y la entidad `Product` conserva las invariantes que siempre deben cumplirse, incluso si el caso de uso cambia. SQL Server añade una última defensa con tipos, claves, índices y restricciones.

Los controladores no conocen EF Core. Traducen HTTP a Commands o Queries y los envían por MediatR. Application declara repositorios como puertos; Infrastructure los implementa con EF Core. Esto permite probar dominio y casos de uso sin levantar la base.

En Angular, la página coordina diálogos, el store mantiene estado con Signals, los servicios encapsulan HTTP y los componentes de presentación reciben datos/emiten intenciones. Cada componente tiene archivos separados de TypeScript, HTML, SCSS y pruebas. `shared` contiene recursos reutilizables que no conocen la feature; `core` contiene infraestructura global.

La entrega se puede levantar con un único comando. El launcher usa ejecución nativa si detecta .NET 10, una versión de Node soportada por Angular 20 y SQL Server; de lo contrario usa Docker Compose. EF Core crea la base, aplica la migración y carga seeds idempotentes.

## Recorrido recomendado para el revisor

Este orden permite explicar primero las decisiones y después los detalles:

1. `README.md`: alcance, inicio y verificación.
2. `backend/src/Agaval.Inventory.Domain/Entities/Product.cs`: invariantes reales del negocio.
3. `backend/src/Agaval.Inventory.Application/Common/Behaviors/ValidationBehavior.cs`: validación transversal.
4. `backend/src/Agaval.Inventory.Application/Features/Products/Create/`: Command, Validator y Handler completos.
5. `backend/src/Agaval.Inventory.Infrastructure/Persistence/`: DbContext, mappings, repositorios y migraciones.
6. `backend/src/Agaval.Inventory.Api/Controllers/ProductsController.cs`: controlador delgado y contrato HTTP.
7. `frontend/src/app/features/products/services/products.store.ts`: estado y mutaciones.
8. `frontend/src/app/features/products/pages/products-page/`: composición de la pantalla.
9. `frontend/src/app/features/products/components/product-form/`: formulario tipado y responsabilidades separadas.
10. `frontend/src/app/shared/components/`: biblioteca de componentes compartidos.
11. `backend/tests/` y specs Angular: comportamiento automatizado.
12. `.github/workflows/ci.yml`, `docker-compose.yml` y launchers: reproducibilidad.

## Cobertura de los requisitos

| Requisito | Implementación | Evidencia principal |
| --- | --- | --- |
| CRUD de productos | Crear, listar, consultar, editar y eliminar | `ProductsController`, vertical slices de `Products` |
| Categorías | CRUD físico protegido por integridad referencial y seed | `CategoriesController`, slices de `Categories`, feature Angular |
| Stock bajo | Regla `Stock < MinimumStock`, filtro y endpoint dedicado | `Product.IsLowStock`, `GetLowStock` |
| Entrada/salida | Ajuste validado y movimiento persistido | `Product.AdjustStock`, `AdjustStock` Handler |
| Validación | Formularios + FluentValidation + dominio + constraints SQL | validators, entidad y configurations EF |
| Clean Architecture | Cuatro proyectos con referencias dirigidas | solution y tests de arquitectura |
| CQRS/MediatR | Command/Query por intención | `Application/Features` |
| Angular moderno | standalone, Signals, OnPush, zoneless y control flow moderno | `app.config.ts`, components y store |
| Escalabilidad frontend | `core/shared/features` y co-localización por componente | `frontend/src/app` |
| Persistencia reproducible | migración EF y seed idempotente | `Migrations`, `DatabaseInitializationExtensions` |
| Documentación | análisis, arquitectura, código, DB, respuestas, calidad y operación | carpeta `Doc` |
| Calidad | format, build, tests, lint, auditorías y CI | `Doc/06-pruebas-y-calidad.md`, workflow CI |
| Extras | JWT, paginación, historial, categorías y Azure | `Doc/09-funcionalidades-opcionales.md` |

## Backend: cómo explicar cada capa

### Domain

`Domain` no depende de ASP.NET Core, MediatR, EF Core ni FluentValidation. Contiene conocimiento que seguiría siendo válido aunque se cambiara la API o la base de datos.

`Product` usa setters privados y métodos con intención:

- el constructor y `UpdateDetails` normalizan nombre y descripción;
- el precio se redondea a dos decimales y debe estar en un rango válido;
- stock y stock mínimo nunca pueden ser negativos;
- la categoría debe tener un identificador válido;
- `IsLowStock` deriva la regla exacta `Stock < MinimumStock`;
- `AdjustStock` solo acepta cantidades positivas y tipos definidos;
- una salida no puede dejar stock negativo;
- una entrada no puede desbordar `int`;
- cada ajuste válido agrega un `InventoryMovement`.

La entidad no confía en que todos sus consumidores recuerden esas reglas. Esa es la diferencia entre un modelo de dominio y una estructura usada únicamente para transportar datos.

### Application

Application expresa casos de uso. Se organiza en vertical slices para que todo lo relacionado con una intención esté próximo: mensaje, validator y Handler.

Flujo de una creación:

```text
CreateProductRequest
  -> CreateProductCommand
  -> ValidationBehavior
  -> CreateProductCommandValidator
  -> CreateProductCommandHandler
  -> ICategoryRepository / IProductRepository / IUnitOfWork
  -> Product
```

`ValidationBehavior<TRequest,TResponse>` ejecuta todos los validators registrados antes del Handler. Agrupa fallos y lanza una excepción de Application conocida por el manejador global. Así no se repite `ValidateAsync` en cada caso de uso.

Los validators protegen la frontera de entrada y pueden consultar dependencias si una regla del caso lo necesita. La entidad protege invariantes internas. No son alternativas: cubren riesgos distintos.

Las interfaces `IProductRepository`, `ICategoryRepository` e `IUnitOfWork` pertenecen a Application porque representan necesidades del caso de uso. Infrastructure depende de esas abstracciones, no al revés.

### Infrastructure

Infrastructure contiene el detalle reemplazable:

- proveedor SQL Server de EF Core;
- `PersistenceContext`;
- mappings por entidad con Fluent API;
- implementaciones de repositorios;
- design-time factory para herramientas EF;
- migración inicial y snapshot.

Los mappings fijan nombres físicos en español, longitudes, precisión decimal, claves foráneas, índices, conversiones de enum y restricciones. Los repositorios de lectura usan `AsNoTracking`, aplican filtros y orden en SQL, y cargan únicamente la categoría necesaria para construir el DTO; los de escritura recuperan entidades con tracking para ejecutar comportamiento de dominio y persistirlo en una unidad de trabajo.

El seed de categorías y productos es determinista. EF registra las migraciones en `__EFMigrationsHistory`; por eso reiniciar la API no duplica estructura ni datos.

### API

La API es el composition root:

- registra Application e Infrastructure;
- configura JSON, CORS, Swagger, health checks y Problem Details;
- registra el exception handler global;
- decide si aplica migraciones al arrancar;
- mapea controladores y endpoints de infraestructura.

`ProductsController` solo transforma request DTOs en Commands/Queries y devuelve códigos HTTP semánticos. No valida manualmente reglas ni usa el DbContext.

El manejador global convierte errores previstos en una forma consistente:

- validación: HTTP 400 con detalles por campo;
- recurso inexistente: HTTP 404;
- regla de dominio: HTTP 400;
- error no previsto: HTTP 500 sin exponer trazas internas al cliente.

## Contrato HTTP para la demostración

| Método | Ruta | Resultado esperado |
| --- | --- | --- |
| `POST` | `/api/autenticacion/login` | JWT con rol y expiración |
| `GET/POST/PUT/DELETE` | `/api/categorias` | consulta y gestión protegida |
| `GET` | `/api/productos` | búsqueda, filtros, orden y página |
| `GET` | `/api/productos/resumen` | métricas globales |
| `GET` | `/api/productos/{id}` | detalle o 404 |
| `GET` | `/api/productos/stock-bajo` | productos donde stock es menor al mínimo |
| `POST` | `/api/productos` | 201 y ubicación del recurso |
| `PUT` | `/api/productos/{id}` | producto actualizado |
| `POST` | `/api/productos/{id}/ajustes-stock` | entrada/salida e historial persistente |
| `DELETE` | `/api/productos/{id}` | 204 o 404 |
| `GET` | `/api/movimientos-inventario` | historial paginado |
| `GET` | `/health` | disponibilidad del proceso API |

`backend/src/Agaval.Inventory.Api/Agaval.Inventory.Api.http` contiene peticiones listas para ejecutar sin depender de Swagger.

## Frontend: estructura y responsabilidades

La estructura toma la cualidad útil del enfoque habitual en React —componentes autocontenidos— sin ignorar las convenciones modernas de Angular:

```text
app/
├── core/                         infraestructura singleton/global
│   ├── config/
│   ├── authentication/
│   ├── interceptors/
│   ├── models/
│   └── services/
├── shared/components/            UI reutilizable y agnóstica al negocio
└── features/
    ├── authentication/
    ├── categories/
    ├── inventory-movements/
    └── products/                 cada feature repite models/services/components/pages/routes
```

Cada componente conserva juntos sus cuatro artefactos:

- `.ts`: contrato, inyección y comportamiento de UI;
- `.html`: estructura declarativa y accesibilidad;
- `.scss`: estilos locales con BEM, sin alcanzar internals ajenos;
- `.spec.ts`: comportamiento observable del componente.

La biblioteca `shared/components` contiene `PageHeader`, `EmptyState` y `ConfirmDialog`. No importa servicios ni modelos de productos, de modo que puede reutilizarse en futuras features.

### Flujo de estado

```text
Componente emite intención
    -> ProductsPage abre diálogo o llama al store
    -> ProductsStore cambia loading/saving
    -> servicio API realiza HTTP
    -> interceptor normaliza errores
    -> store actualiza Signals
    -> computed recalcula lista/métricas
    -> OnPush renderiza únicamente lo necesario
```

`ProductsStore` mantiene Signals privados y expone vistas readonly. Guarda el query y la página devuelta, mientras el resumen global se consulta aparte; así una página parcial nunca produce métricas incorrectas. Las mutaciones están centralizadas, notifican y recargan página/resumen.

Los componentes no conocen URLs. `ProductsApiService` y `CategoriesApiService` encapsulan el contrato HTTP. El navegador usa `/api`; Angular CLI lo dirige a la API en desarrollo y Nginx lo hace en el contenedor.

### Decisiones Angular que conviene nombrar

- standalone elimina módulos ceremoniales;
- lazy route limita la carga inicial y define el alcance del store;
- `provideZonelessChangeDetection` evita depender de `zone.js`;
- Signals hacen explícitas las dependencias reactivas;
- `ChangeDetectionStrategy.OnPush` reduce trabajo de render;
- reactive forms tipados evitan estados `any`;
- `@if` y `@for` usan el control flow actual;
- estilos por componente evitan acoplamiento CSS;
- Angular Material aporta accesibilidad y patrones consistentes sin impedir identidad visual.

## Base de datos y consistencia

Las relaciones principales son:

```text
Categoria 1 ───── * Producto 1 ───── * MovimientoInventario
```

Las categorías se precargan y solo las activas se presentan para selección de productos. El catálogo conserva también las inactivas para administración. Cada ajuste de stock crea un movimiento asociado. La eliminación física del producto elimina su historial conforme a la decisión documentada para este CRUD; una categoría solo puede eliminarse físicamente cuando no tiene productos asociados.

La consistencia se protege en cuatro niveles:

1. formulario: experiencia inmediata;
2. FluentValidation: contrato del caso de uso;
3. Domain: invariantes independientes de la entrada;
4. SQL Server: integridad referencial y constraints.

## Pruebas y qué demuestran

### Backend

Las pruebas de dominio demuestran que una entidad válida acepta operaciones y una inválida las rechaza. Las pruebas de Application comprueban validators y orquestación de Handlers con dobles de repositorio. La prueba de arquitectura impide referencias entre capas que rompan la dirección de dependencias.

Comandos:

```bash
cd backend
dotnet format Agaval.Inventory.slnx --verify-no-changes --no-restore
dotnet build Agaval.Inventory.slnx --configuration Release
dotnet test Agaval.Inventory.slnx --configuration Release --no-build
```

### Frontend

Los specs cubren shell, componentes, estados visibles, eventos y servicios HTTP. Lint y TypeScript strict detectan errores que no requieren ejecutar la UI.

```bash
cd frontend
npm run lint
npm test -- --watch=false --browsers=ChromeHeadless
npm run build
```

### CI

El pipeline repite restore, format, build, test, lint, auditoría de dependencias y construcción de imágenes. También valida la sintaxis de los launchers y la resolución de Docker Compose. El objetivo no es solo “funciona en mi máquina”, sino hacer repetible la evidencia.

## Guion de demostración de 5 a 7 minutos

1. Ejecutar el launcher y mostrar que espera API/frontend.
2. Abrir el dashboard y explicar métricas globales, búsqueda y paginación de servidor.
3. Iniciar sesión con la cuenta de evaluación y mostrar cómo aparecen las acciones protegidas.
4. Filtrar por categoría/stock y ordenar la tabla.
5. Crear y editar un producto, provocando primero una validación visible.
6. Registrar una entrada y consultar el registro en `/movimientos`.
7. Intentar una salida superior al stock para mostrar la regla del dominio y Problem Details.
8. Crear, editar y eliminar una categoría en `/categorias`; explicar el 409 si está en uso.
9. Eliminar el producto con confirmación y mostrar un vertical slice/Store.
10. Cerrar con las 54 pruebas, el E2E sobre SQL Server y el despliegue Azure automatizado.

La API aplica migraciones antes de mapear tráfico, de modo que una base inaccesible impide el arranque inicial. El health check actual confirma el proceso API; no debe presentarse como una comprobación SQL continua.

Para no arriesgar la demo, antes de la entrevista:

```bash
./start.sh --status
curl --fail http://localhost:5100/health
curl --fail http://localhost:5100/api/productos
```

En Windows se puede usar `Invoke-WebRequest` en lugar de `curl`.

## Preguntas probables y respuestas modelo

### ¿Por qué FluentValidation si el dominio ya valida?

FluentValidation protege el contrato del caso de uso y produce errores amigables por campo antes de ejecutar trabajo. El dominio es la última autoridad y debe seguir siendo válido aunque la entidad se invoque desde otra API, un job o una prueba. Quitar cualquiera de los dos debilita una frontera distinta.

### ¿Por qué CQRS si la aplicación es pequeña?

No se separaron bases de lectura y escritura; se usó CQRS a nivel de intención. Commands y Queries hacen explícito qué cambia estado, aíslan validaciones y permiten crecer por vertical slices. El costo se controló evitando capas y abstracciones adicionales que no aportan al alcance.

### ¿Por qué repositorios y no DbContext directamente en los Handlers?

El estándar exige inversión de dependencias y los puertos hacen comprobable ese límite. También permiten tests de caso de uso sin EF. En una solución distinta podría aceptarse DbContext como unidad de trabajo, pero aquí los repositorios expresan operaciones del dominio y mantienen Application independiente del proveedor.

### ¿Por qué no se recrea una tabla si falta?

Porque la ausencia aislada de una tabla con historial de migración intacto indica daño o manipulación parcial. Recrearla silenciosamente puede ocultar corrupción y dejar datos incoherentes. EF Core migrations resuelve estados versionados conocidos; un estado dañado exige restauración o reparación auditada.

### ¿Por qué Signals y no NgRx?

El estado es local a una feature y no requiere event sourcing, efectos complejos ni coordinación global. Signals ofrecen una fuente de verdad pequeña, tipada y eficiente. Si crecieran múltiples features con flujos cruzados, se reevaluaría un store más estructurado.

### ¿Por qué paginación y filtros en el servidor?

Para que el contrato escale sin descargar el catálogo completo. SQL Server ejecuta búsqueda, filtros, orden, conteo y `Skip/Take`; Angular conserva el query en la URL. Las métricas se obtienen mediante un endpoint de resumen independiente para no calcularlas sobre una sola página.

### ¿Por qué la migración automática está habilitada?

Solo para Development y el Compose local con una única API, donde simplifica evaluación y onboarding. En producción/Kubernetes se deshabilita; el despliegue debe ejecutar migraciones una vez, con una identidad autorizada, antes de escalar réplicas.

### ¿Cómo evita condiciones de carrera en stock?

La operación actual se guarda en una transacción de `SaveChanges`, pero no implementa un token de concurrencia optimista. Para múltiples escritores se agregaría `rowversion`, se capturaría `DbUpdateConcurrencyException` y se devolvería HTTP 409 o se reintentaría según la regla de negocio. Es una mejora reconocida, no una garantía que el código actual finja ofrecer.

### ¿Cómo se protegen secretos?

Por decisión de esta entrega, `.env` y `.env.example` incluyen credenciales exclusivamente locales para facilitar la evaluación. No son credenciales cloud. El workflow de Azure exige secretos del environment de GitHub y los inyecta como secretos de Container Apps; en producción deben rotarse, administrarse con un secret manager y combinarse con TLS y privilegios mínimos.

### ¿Qué cambiaría para producción?

Reemplazaría la identidad configurable por un proveedor OIDC/Entra ID, agregaría concurrencia optimista, telemetría centralizada, Key Vault, TLS estricto, migración como job, tests SQL efímeros y E2E sobre el artefacto desplegable. Las imágenes Azure ya usan tags inmutables por SHA.

## Límites implementados, sin ocultarlos

| Tema | Estado actual | Evolución razonable |
| --- | --- | --- |
| Autenticación | JWT configurable y política `InventoryWrite` | federación OIDC/Entra ID y usuarios persistidos |
| Paginación | búsqueda/filtros/orden/página server-side | cursores si el volumen y consistencia lo exigen |
| Concurrencia de stock | transacción única, sin `rowversion` | control optimista y respuesta 409 |
| Historial en UI | endpoint y pantalla paginada | exportación/auditoría por usuario |
| Categorías | CRUD separado con eliminación física protegida | control de concurrencia y auditoría |
| Cloud | Bicep + workflow manual Azure | ejecución requiere suscripción y secrets del propietario |
| E2E | recorrido contractual automatizado y recorrido visual sobre Docker + SQL Server | ampliar automatización visual Playwright en CI |
| Integración SQL en CI | Compose levanta SQL Server y ejecuta el E2E completo | migración separada contra staging antes de producción |
| Swagger | solo Development | portal de API autenticado si se requiere |
| Apple Silicon | funciona por emulación en Docker Desktop | SQL remoto o host x86-64 soportado |

Reconocer estos límites demuestra criterio. Una prueba profesional no consiste en afirmar que todo está resuelto, sino en delimitar qué garantiza el código, por qué se eligió y cuál sería el siguiente paso.

## Lista final antes de entregar o entrevistar

- `git status` contiene únicamente cambios intencionales; `.env` se versiona por decisión explícita de la entrega.
- autor Git es `Yeison Mosquera <yeisonNEDF@gmail.com>`.
- `./start.sh --status` o `.\start.ps1 -Status` muestra servicios activos.
- frontend, `/health`, `/api/productos` y `/api/categorias` responden.
- backend format/build/test están verdes.
- frontend lint/test/build están verdes.
- Compose resuelve la configuración.
- no hay cambios de modelo pendientes respecto a la migración.
- el README y esta guía coinciden con el comportamiento real.
- se pueden explicar con claridad las decisiones y también los límites.
