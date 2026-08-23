# 02. Documentación del backend

## Configuración de solución

- `global.json` fija el SDK .NET 10 para evitar compilaciones accidentales con otra versión.
- `Directory.Build.props` activa nullable, análisis moderno y warnings como errores en todos los proyectos.
- `Agaval.Inventory.slnx` agrupa las cuatro capas y los tres proyectos de pruebas.
- `dotnet-tools.json` fija `dotnet-ef`, haciendo reproducibles las migraciones.

## Domain

### `Common/DomainException.cs`

Representa una violación de invariantes del negocio. Permite distinguir una entrada inválida de un error inesperado de infraestructura.

### `Entities/Category.cs`

Modela una categoría con `Id`, `Name` y `IsActive`. Normaliza el nombre, impide valores vacíos o superiores a 100 caracteres y expone `Update`; la eliminación pertenece al caso de uso y al repositorio porque cambia la persistencia, no el estado interno de la entidad.

### `Entities/Product.cs`

Es el agregado principal.

- El constructor valida y normaliza todos los datos iniciales.
- `UpdateDetails` centraliza las mismas invariantes para una edición.
- `IsLowStock` expresa la regla `Stock < MinimumStock` una sola vez.
- `AdjustStock` exige cantidad positiva, impide una salida superior a las existencias, modifica el stock y agrega un `InventoryMovement`.
- Los setters privados evitan estados inválidos producidos desde otras capas.

### `Entities/InventoryMovement.cs`

Registra producto, tipo, cantidad, fecha UTC y observación. Es inmutable desde el exterior después de su creación y aporta auditoría a cada entrada o salida.

### `Enums/StockMovementType.cs`

Enum tipado `Entry/Exit`. API lo serializa como texto; Infrastructure lo convierte a `ENTRADA/SALIDA` para respetar el esquema propuesto.

## Application

### Puertos de persistencia

- `IProductRepository`: consulta paginada/ordenada, resumen, búsqueda por id, alta y baja.
- `ICategoryRepository`: listado completo o activo, búsqueda, unicidad, alta, actualización, comprobación de uso y eliminación.
- `IInventoryMovementRepository`: historial paginado por producto y tipo.
- `IIdentityService`: valida la identidad configurable y emite un token sin acoplar Application a JWT.
- `IUnitOfWork`: frontera explícita de confirmación con `SaveChangesAsync`.

Las interfaces viven en Application; Infrastructure depende de ellas, no al contrario.

### Comportamiento transversal

`ValidationBehavior<TRequest,TResponse>` obtiene todos los validadores FluentValidation del mensaje antes de ejecutar el Handler. Acumula los fallos y lanza `ApplicationValidationException` con un diccionario por propiedad. Esto elimina validación repetida en controladores.

### Excepciones

- `ApplicationValidationException`: errores de forma o reglas anticipables, convertidos a HTTP 400.
- `NotFoundException`: recurso inexistente, convertido a HTTP 404.
- `ConflictException`: duplicados o conflictos funcionales, convertido a HTTP 409.
- `AuthenticationFailedException`: credenciales inválidas, convertido a HTTP 401.

### Modelos comunes

`ProductFilter`, `InventoryMovementFilter`, `StockFilter`, `ProductSortField` y `SortDirection` expresan consultas sin términos de EF. `PagedResult<T>` normaliza metadatos de página. Los DTO evitan exponer entidades rastreadas o navegaciones internas.

### Categories

Los slices `GetList`, `GetById`, `Create`, `Update` y `Delete` cubren el CRUD. La creación/edición valida unicidad sin distinguir mayúsculas. `Delete` comprueba si existen productos asociados: responde conflicto si está en uso y, en caso contrario, elimina físicamente la fila. El endpoint de categorías activas continúa alimentando formularios.

### Authentication y movimientos

`LoginCommand` valida credenciales y proyecta la sesión firmada. `GetInventoryMovementsQuery` valida filtros/página y devuelve movimientos con producto, tipo, cantidad, fecha y observación.

### Products/Create

- `CreateProductCommand`: datos necesarios para la intención de crear.
- `CreateProductCommandValidator`: nombre, longitud, precio, stock, mínimo y categoría.
- `CreateProductCommandHandler`: confirma que la categoría activa exista, crea la entidad, agrega el producto, confirma la unidad de trabajo y devuelve el DTO.

### Products/GetList y GetById

`GetProductsQuery` valida y transforma búsqueda, categoría, stock, página, tamaño, campo de orden y dirección en `ProductFilter`. El repositorio ejecuta `COUNT`, orden y `Skip/Take` en SQL Server. `GetProductByIdQuery` devuelve un único producto o `NotFoundException`; `GetInventorySummaryQuery` calcula métricas globales aparte de la página visible.

### Products/GetLowStock

`GetLowStockProductsQuery` reutiliza el repositorio con el predicado `Stock < MinimumStock`. El endpoint específico no duplica lógica en el controlador.

### Products/Update

El Validator aplica las mismas reglas de entrada que Create. El Handler valida tanto producto como categoría, invoca `Product.UpdateDetails`, confirma y devuelve la representación actualizada.

### Products/Delete

Comprueba un identificador positivo, busca el agregado, solicita su eliminación y confirma. La ausencia produce 404 de forma uniforme.

### Products/AdjustStock

Valida identificador, enum, cantidad y longitud de observación. El Handler carga el agregado, delega el cálculo a `Product.AdjustStock` y guarda producto y movimiento en la misma unidad de trabajo.

### `DependencyInjection.cs`

Registra MediatR, validadores y el pipeline de validación usando la asamblea de Application como marcador. API solo necesita llamar `AddApplication()`.

## Infrastructure

### `PersistenceContext.cs`

Declara `DbSet` para las tres entidades, aplica automáticamente todas las configuraciones de la asamblea e implementa `IUnitOfWork` mediante el `SaveChangesAsync` heredado.

### Configuraciones EF

- `CategoryConfiguration`: tabla `Categorias`, clave identity, límites, default activo y seed de tres filas.
- `ProductConfiguration`: tabla `Productos`, precisión `numeric(10,2)`, timestamps UTC, checks, relación restrictiva con categoría, índices y dos productos de ejemplo.
- `InventoryMovementConfiguration`: tabla opcional incluida como plus, conversión del enum, checks, relación con producto e índice cronológico.

Los mapeos son explícitos: un cambio de convención de EF no modifica silenciosamente el contrato físico.

### Repositorios

`ProductRepository` encapsula includes, filtros, búsqueda, ordenamiento, paginación y tracking. Las lecturas usan `AsNoTracking`; las operaciones que cambian el agregado conservan tracking. `CategoryRepository` implementa el catálogo administrable y `InventoryMovementRepository` proyecta el historial cronológico.

### Autenticación configurable

`AuthenticationOptions` valida configuración obligatoria y una clave mínima de 32 caracteres. `ConfiguredIdentityService` compara credenciales en tiempo constante y firma JWT HS256 con issuer, audience, expiración y rol. No simula una gestión completa de usuarios: es una identidad local reemplazable mediante `IIdentityService`.

### Composición y diseño

`DependencyInjection.cs` valida que exista `ConnectionStrings:Database`, configura SQL Server con reintentos transitorios y registra repositorios scoped. `PersistenceContextFactory` permite a `dotnet ef` construir el contexto durante diseño sin arrancar la API.

### Migración y SQL

`Persistence/Migrations/*InitialCreate*` es la migración fuente. `database/initial.sql` es una representación idempotente para revisión o ejecución manual. No deben editarse ambos por separado: se cambia el modelo, se crea una nueva migración y se regenera el SQL.

## API

### Contratos HTTP

Los requests de productos, categorías y login representan el JSON de entrada. Se mantienen separados de los Commands para que la evolución de HTTP no contamine Application.

Los records de transporte no duplican reglas mediante Data Annotations. Cada acción los transforma en Commands y el pipeline de FluentValidation conserva una única fuente de verdad para longitudes, rangos, enum y campos obligatorios. Esto evita divergencias y es compatible con el model binding de records posicionales en ASP.NET Core 10.

### `ProductsController.cs`

| Método | Ruta | Caso de uso |
|---|---|---|
| GET | `/api/productos` | Busca, filtra, ordena y pagina productos |
| GET | `/api/productos/resumen` | Calcula métricas globales |
| GET | `/api/productos/stock-bajo` | Lista stock bajo |
| GET | `/api/productos/{id}` | Obtiene detalle |
| POST | `/api/productos` | Crea y responde 201 |
| PUT | `/api/productos/{id}` | Edita |
| DELETE | `/api/productos/{id}` | Elimina y responde 204 |
| POST | `/api/productos/{id}/ajustes-stock` | Registra entrada/salida |

Cada acción solo traduce el request a un mensaje MediatR y traduce el resultado a HTTP.

### `CategoriesController.cs`

Expone listado, detalle, alta, edición y eliminación física. Las escrituras requieren `InventoryWrite`; `incluirInactivas=true` permite administrar todo el catálogo. Una eliminación que violaría la relación restrictiva devuelve HTTP 409 antes de llegar a SQL Server.

### `AuthenticationController.cs` e `InventoryMovementsController.cs`

El primero entrega la sesión JWT mediante `POST /api/autenticacion/login`. El segundo consulta el historial con `productoId`, `tipo`, `pagina` y `tamanoPagina`.

### `GlobalExceptionHandler.cs`

Convierte validaciones e invariantes de dominio a 400, autenticación fallida a 401, ausencias a 404, duplicados/conflictos a 409 y errores inesperados a 500. La respuesta estándar incluye `traceId`; los detalles internos no se filtran al cliente.

### Infraestructura HTTP

- `CorsPolicies.cs` nombra la política global.
- `DatabaseInitializationExtensions.cs` detecta migraciones pendientes y ejecuta `MigrateAsync` cuando el ambiente lo autoriza. Está activo en Development y Compose, y desactivado en producción por defecto.
- `Program.cs` es el composition root: registra capas, JWT Bearer, política por rol, JSON enums, Problem Details, Swagger con esquema bearer, health, CORS y controllers.
- `Agaval.Inventory.Api.http` contiene llamadas manuales reproducibles.

## Pruebas backend

- `ProductTests`: creación, stock bajo, entrada, salida e intento de stock negativo.
- `CreateProductCommandValidatorTests`: reglas de entrada válidas e inválidas.
- `CreateProductCommandHandlerTests`: orquestación sin base de datos mediante dobles de repositorio.
- `ArchitectureDependencyTests`: impide referencias prohibidas desde Domain y Application.
- `ProductsEndpointsTests`: recorre por HTTP autorización, validación, CRUD, stock bajo, ajuste, historial, paginación y resumen.
- `CategoriesEndpointsTests`: demuestra 401, alta, conflicto por nombre, edición, 409 al eliminar una categoría usada y eliminación física después de liberar la relación.
- `AuthenticationEndpointsTests`: rechaza credenciales inválidas y valida la sesión JWT.

La verificación actual ejecuta 16 pruebas .NET: 8 de Domain, 5 de Application y 3 funcionales.
