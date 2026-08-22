# 02. Documentación del backend

## Configuración de solución

- `global.json` fija el SDK .NET 10 para evitar compilaciones accidentales con otra versión.
- `Directory.Build.props` activa nullable, análisis moderno y warnings como errores en todos los proyectos.
- `Agaval.Inventory.slnx` agrupa las cuatro capas y los dos proyectos de pruebas.
- `dotnet-tools.json` fija `dotnet-ef`, haciendo reproducibles las migraciones.

## Domain

### `Common/DomainException.cs`

Representa una violación de invariantes del negocio. Permite distinguir una entrada inválida de un error inesperado de infraestructura.

### `Entities/Category.cs`

Modela una categoría precargada con `Id`, `Name` y `IsActive`. Su constructor exige un identificador positivo e impide nombres vacíos o superiores a 100 caracteres.

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

- `IProductRepository`: búsquedas con filtros, búsqueda por id, alta y baja.
- `ICategoryRepository`: categorías activas y comprobación de categoría válida.
- `IUnitOfWork`: frontera explícita de confirmación con `SaveChangesAsync`.

Las interfaces viven en Application; Infrastructure depende de ellas, no al contrario.

### Comportamiento transversal

`ValidationBehavior<TRequest,TResponse>` obtiene todos los validadores FluentValidation del mensaje antes de ejecutar el Handler. Acumula los fallos y lanza `ApplicationValidationException` con un diccionario por propiedad. Esto elimina validación repetida en controladores.

### Excepciones

- `ApplicationValidationException`: errores de forma o reglas anticipables, convertidos a HTTP 400.
- `NotFoundException`: recurso inexistente, convertido a HTTP 404.

### Modelos comunes

`ProductFilter` y `StockFilter` expresan filtros sin términos de EF. `ProductDto` y `CategoryDto` son contratos de salida y evitan exponer entidades rastreadas o navegaciones internas.

### Categories

`GetActiveCategoriesQuery` y su Handler consultan únicamente categorías activas y las proyectan a DTO. No se implementa CRUD porque es opcional en la prueba.

### Products/Create

- `CreateProductCommand`: datos necesarios para la intención de crear.
- `CreateProductCommandValidator`: nombre, longitud, precio, stock, mínimo y categoría.
- `CreateProductCommandHandler`: confirma que la categoría activa exista, crea la entidad, agrega el producto, confirma la unidad de trabajo y devuelve el DTO.

### Products/GetList y GetById

`GetProductsQuery` valida y transforma los parámetros HTTP en `ProductFilter`. El repositorio aplica la consulta en servidor con `AsNoTracking`. `GetProductByIdQuery` devuelve un único producto o `NotFoundException`.

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

`ProductRepository` encapsula includes, filtros, ordenamiento y tracking. Las lecturas usan `AsNoTracking`; las operaciones que cambian el agregado conservan tracking. `CategoryRepository` restringe las consultas a categorías activas.

### Composición y diseño

`DependencyInjection.cs` valida que exista `ConnectionStrings:Database`, configura SQL Server con reintentos transitorios y registra repositorios scoped. `PersistenceContextFactory` permite a `dotnet ef` construir el contexto durante diseño sin arrancar la API.

### Migración y SQL

`Persistence/Migrations/*InitialCreate*` es la migración fuente. `database/initial.sql` es una representación idempotente para revisión o ejecución manual. No deben editarse ambos por separado: se cambia el modelo, se crea una nueva migración y se regenera el SQL.

## API

### Contratos HTTP

`CreateProductRequest`, `UpdateProductRequest` y `AdjustStockRequest` representan el JSON de entrada. Se mantienen separados de los Commands para que la evolución de HTTP no contamine Application.

### `ProductsController.cs`

| Método | Ruta | Caso de uso |
|---|---|---|
| GET | `/api/productos` | Lista y filtra productos |
| GET | `/api/productos/stock-bajo` | Lista stock bajo |
| GET | `/api/productos/{id}` | Obtiene detalle |
| POST | `/api/productos` | Crea y responde 201 |
| PUT | `/api/productos/{id}` | Edita |
| DELETE | `/api/productos/{id}` | Elimina y responde 204 |
| POST | `/api/productos/{id}/ajustes-stock` | Registra entrada/salida |

Cada acción solo traduce el request a un mensaje MediatR y traduce el resultado a HTTP.

### `CategoriesController.cs`

Expone `GET /api/categorias`, suficiente para poblar la lista del formulario y el filtro.

### `GlobalExceptionHandler.cs`

Convierte validaciones e invariantes de dominio a 400, ausencias a 404, conflictos de concurrencia a 409 y errores inesperados a 500. La respuesta estándar incluye `traceId`; los detalles internos no se filtran al cliente.

### Infraestructura HTTP

- `CorsPolicies.cs` nombra la política global.
- `DatabaseInitializationExtensions.cs` detecta migraciones pendientes y ejecuta `MigrateAsync` cuando el ambiente lo autoriza. Está activo en Development y Compose, y desactivado en producción por defecto.
- `Program.cs` es el composition root: registra capas, JSON enums, Problem Details, Swagger, health, CORS y controllers.
- `Agaval.Inventory.Api.http` contiene llamadas manuales reproducibles.

## Pruebas backend

- `ProductTests`: creación, stock bajo, entrada, salida e intento de stock negativo.
- `CreateProductCommandValidatorTests`: reglas de entrada válidas e inválidas.
- `CreateProductCommandHandlerTests`: orquestación sin base de datos mediante dobles de repositorio.
- `ArchitectureDependencyTests`: impide referencias prohibidas desde Domain y Application.
