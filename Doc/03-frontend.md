# 03. Documentación del frontend

## Bootstrap y shell

### `main.ts`

Arranca `App` con `bootstrapApplication`; no existe ningún NgModule.

### `app.config.ts`

Es el composition root del cliente. Registra:

- listeners globales de errores;
- inicialización de Material Symbols locales;
- `provideZonelessChangeDetection()`;
- animaciones de Angular Material;
- router con binding de inputs;
- HttpClient con interceptores de errores y token JWT;
- base relativa `/api`;
- valores predeterminados del snackbar.

### `app.routes.ts`

Redirige la raíz a productos y carga cada feature con `loadChildren`/`loadComponent`. Los dominios funcionales quedan en chunks lazy separados.

Las rutas visibles de la aplicación son:

- `/productos`: inventario completo;
- `/productos/stock-bajo`: vista enfocada en productos cuyo stock está por debajo del mínimo;
- `/movimientos`: historial paginado de entradas y salidas;
- `/categorias`: catálogo administrable protegido por guard;
- `/login`: inicio de sesión y retorno a la ruta solicitada.

Las rutas aparecen de forma contextual en la navegación, admiten acceso directo y conservan en la URL filtros, búsqueda, página y orden. Una URL desconocida vuelve de forma segura al inventario.

### `app.ts`, `app.html`, `app.scss`

Implementan únicamente el shell: cabecera de marca, navegación y `router-outlet`. La hoja SCSS usa BEM y adapta toolbar y márgenes a móvil; no conoce reglas del inventario.

### `styles.scss`

Define el tema Material, tokens de color, radios, bordes y sombras, tipografía variable Manrope y Material Symbols empaquetados localmente, normalización global y variantes del snackbar. La fuente se sirve desde el propio artefacto para no depender de un CDN. No usa estilos inline, `!important` ni `::ng-deep`.

## Core

### `core/config/api.config.ts`

Declara `API_BASE_URL` como token de inyección. Los servicios no dependen de una constante importada difícil de reemplazar en tests.

### `core/models/api-error.model.ts`

Tipa Problem Details y su diccionario de validaciones. Permite procesar errores sin `any`.

### `core/interceptors/api-error.interceptor.ts`

Intercepta errores HTTP, extrae el mensaje más útil, notifica al usuario y vuelve a propagar el error para que el Store cierre correctamente su estado de carga.

### `core/authentication` y `auth-token.interceptor.ts`

`AuthenticationApiService` encapsula el login. `AuthenticationStore` conserva una sesión tipada en `sessionStorage`, valida su expiración y expone `isAuthenticated`. El guard protege productos, stock bajo, movimientos y categorías preservando la URL de retorno; el guard de invitado evita volver al login con una sesión activa. El interceptor agrega `Authorization: Bearer` únicamente a peticiones `/api`; una expiración o 401 elimina la sesión y redirige inmediatamente al login.

### `core/services/notification.service.ts`

Centraliza snackbars de éxito y error y sus clases temáticas. Evita que cada feature conozca configuración visual global.

## Shared

Cada componente tiene `.ts`, `.html`, `.scss` y `.spec.ts`.

- `PageHeaderComponent`: encabezado semántico con eyebrow, título, descripción y slot de acciones.
- `EmptyStateComponent`: estado vacío reutilizable con icono y textos configurables.
- `ConfirmDialogComponent`: confirmación tipada para operaciones destructivas; no sabe qué entidad está eliminando.

Shared no importa servicios ni modelos de Products, por lo que puede reutilizarse en futuras features.

## Feature Products

### Modelos

- `category.model.ts`: categoría de lectura.
- `product.model.ts`: producto, payload create/update, filtros, búsqueda, paginación, orden y resumen.
- `stock-adjustment.model.ts`: enum string y payload del movimiento.

Todos los contratos reflejan el JSON de la API y evitan tipos abiertos.

### Servicios HTTP

`ProductsApiService` encapsula las rutas para listar de forma paginada, consultar, resumir, crear, editar, eliminar y ajustar stock. `CategoriesApiService` obtiene categorías activas para los formularios. Ambos inyectan HttpClient y `API_BASE_URL`.

### `ProductsStore`

Es el estado de la ruta lazy:

- signals privados: página de productos, categorías, query, resumen, loading y error;
- señales públicas readonly para impedir mutación externa;
- computed: metadatos de página, filtros activos y resumen global;
- métodos asíncronos para carga y mutaciones;
- refresco consistente tras cada escritura;
- protección con `try/finally` para restablecer loading incluso ante error.

El Store es la equivalencia al patrón de separación de estado usado en React: los componentes no llaman directamente a HttpClient ni mantienen copias divergentes de los datos.

### `ProductFiltersComponent`

Componente presentacional. Recibe categorías y filtros, y emite búsqueda/cambios tipados. El template combina campo de texto, Material Select y botón Limpiar. El SCSS mantiene la cuadrícula responsive sin afectar el listado.

### `ProductListComponent`

Recibe la página y el permiso de gestión; emite ajuste, edición, eliminación, cambio de página y orden. En escritorio renderiza una tabla Material con `MatSort`/`MatPaginator`; en pantallas angostas las filas se reorganizan como tarjetas. La feature solo se activa después de autenticar al usuario.

### `ProductFormComponent`

Dialog de creación/edición con un `FormGroup` estrictamente tipado y controles `nonNullable` donde corresponde:

- controles tipados y validadores equivalentes al backend;
- patch inicial en modo edición;
- normalización del valor antes de cerrar;
- errores accesibles y botón deshabilitado mientras el formulario sea inválido;
- distribución compacta de 12 columnas que aprovecha el ancho en escritorio;
- tamaño del panel limitado al viewport y contenido sin desbordamiento horizontal;
- cierre explícito, acciones consistentes y layout responsive en archivo SCSS independiente.

La validación cliente mejora UX; la API sigue siendo la autoridad.

### `StockAdjustmentDialogComponent`

Dialog tipado para entrada/salida. Calcula con `computed` el stock resultante, bloquea salidas imposibles y captura una observación opcional. Comparte el tratamiento responsive del formulario: encabezado, cierre visible, panel limitado al viewport y acciones siempre accesibles. Solo devuelve el payload; el Page decide ejecutar el caso de uso.

### `ProductsPageComponent`

Es el contenedor de la feature. Conecta Store y componentes, abre dialogs si hay sesión y muestra métricas globales. Sincroniza búsqueda, filtros, página, tamaño y orden con la URL. Orquesta intenciones de UI, pero las llamadas HTTP y el estado viven en servicios.

### `routes.ts`

Declara las vistas `''` y `stock-bajo` reutilizando la misma página lazy y provee `ProductsStore`, `ProductsApiService` y `CategoriesApiService` en el límite de la feature. Al abandonarla se descarta su estado; no se eleva innecesariamente al scope global.

## Feature Categories

`features/categories` conserva `models`, `services`, `components`, `pages` y `routes.ts`. Su store carga activas e inactivas. `CategoryFormComponent` solo gestiona el formulario; `CategoryListComponent` solo presenta y emite acciones; `CategoriesPageComponent` coordina crear, editar y eliminar. Si la API informa que una categoría está asociada a productos, el interceptor presenta el conflicto y conserva la fila. La ruta es lazy y exige autenticación.

## Feature Inventory Movements

`features/inventory-movements` sigue la misma estructura. El filtro selecciona producto y tipo; el listado presenta fecha, producto, entrada/salida, cantidad y observación; el store conserva página y carga desde el endpoint paginado. Es una vista autenticada de auditoría y no modifica inventario.

## Feature Authentication

La página de login tiene archivos TypeScript, HTML y SCSS independientes, formulario tipado, feedback de carga y redirección segura. El shell cambia entre iniciar/cerrar sesión y muestra la administración de categorías solo cuando corresponde.

## Templates y rendimiento

- `@if` y `@for` reemplazan directivas estructurales antiguas.
- `track` usa identidad estable.
- todos los componentes declaran OnPush;
- no se ejecutan transformaciones pesadas desde templates;
- Signals notifican de manera explícita los cambios en modo zoneless;
- las rutas de feature se descargan bajo demanda.

## Estilos escalables

Cada componente posee un bloque BEM raíz y elementos con `__`. Los media queries están junto al componente que cambia. Los tokens globales representan decisiones de diseño compartidas; las reglas locales no atraviesan encapsulación.

## Pruebas frontend

Las 50 pruebas cubren shell autenticado/anónimo, persistencia y expiración de sesión, guards, rutas lazy protegidas, login, filtros, tabla/paginador, formularios, ajuste, token/401, accesibilidad de acciones, categorías, movimientos y contratos HTTP. Los 16 componentes tienen un `.spec.ts` colocado junto a sus archivos de implementación. Cada TestBed activa explícitamente zoneless para reproducir la configuración real y verifica comportamiento observable, no detalles internos del framework.
