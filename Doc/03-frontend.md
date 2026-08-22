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
- HttpClient con interceptor de errores;
- base relativa `/api`;
- valores predeterminados del snackbar.

### `app.routes.ts`

Redirige la raíz a productos y carga la feature con `loadChildren`. El código de inventario queda en un chunk lazy separado.

Las rutas visibles de la aplicación son:

- `/productos`: inventario completo;
- `/productos/stock-bajo`: vista enfocada en productos cuyo stock está por debajo del mínimo.

Ambas aparecen en la navegación principal, admiten acceso directo y conservan en la URL los filtros compartibles (`categoriaId` y, en el inventario general, `stock=normal`). Una URL desconocida vuelve de forma segura al inventario.

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
- `product.model.ts`: producto, payload create/update, filtros y tipo de estado de stock.
- `stock-adjustment.model.ts`: enum string y payload del movimiento.

Todos los contratos reflejan el JSON de la API y evitan tipos abiertos.

### Servicios HTTP

`ProductsApiService` encapsula las rutas para listar, consultar, crear, editar, eliminar y ajustar stock. `CategoriesApiService` solo obtiene categorías activas. Ambos inyectan HttpClient y `API_BASE_URL`.

### `ProductsStore`

Es el estado de la ruta lazy:

- signals privados: productos, categorías, filtros, loading y error;
- señales públicas readonly para impedir mutación externa;
- computed: cantidad total, cantidad baja y valor total;
- métodos asíncronos para carga y mutaciones;
- refresco consistente tras cada escritura;
- protección con `try/finally` para restablecer loading incluso ante error.

El Store es la equivalencia al patrón de separación de estado usado en React: los componentes no llaman directamente a HttpClient ni mantienen copias divergentes de los datos.

### `ProductFiltersComponent`

Componente presentacional. Recibe categorías y filtros, y emite cambios tipados. El template usa Material Select y el botón Limpiar. El SCSS mantiene la cuadrícula responsive sin afectar el listado.

### `ProductListComponent`

Recibe productos y emite tres intenciones: ajustar, editar y eliminar. Renderiza una tabla Material, chips de categoría/estado, formato monetario e indicador visual. La tabla dispone de scroll horizontal propio en pantallas angostas para no romper el layout general.

### `ProductFormComponent`

Dialog de creación/edición con un `FormGroup` estrictamente tipado y controles `nonNullable` donde corresponde:

- controles tipados y validadores equivalentes al backend;
- patch inicial en modo edición;
- normalización del valor antes de cerrar;
- errores accesibles y botón deshabilitado mientras el formulario sea inválido;
- layout responsive en archivo SCSS independiente.

La validación cliente mejora UX; la API sigue siendo la autoridad.

### `StockAdjustmentDialogComponent`

Dialog tipado para entrada/salida. Calcula con `computed` el stock resultante, bloquea salidas imposibles y captura una observación opcional. Solo devuelve el payload; el Page decide ejecutar el caso de uso.

### `ProductsPageComponent`

Es el contenedor de la feature. Conecta Store y componentes, abre dialogs y muestra las métricas. Sincroniza los filtros con la ruta, adapta el encabezado para la vista de stock bajo y hace que los filtros puedan compartirse mediante URL. Orquesta intenciones de UI, pero las llamadas HTTP y el estado viven en servicios. El constructor solicita la carga inicial sin Zone.js.

### `routes.ts`

Declara las vistas `''` y `stock-bajo` reutilizando la misma página lazy y provee `ProductsStore`, `ProductsApiService` y `CategoriesApiService` en el límite de la feature. Al abandonarla se descarta su estado; no se eleva innecesariamente al scope global.

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

Los 19 specs cubren shell, shared, filtros, lista, formulario, ajuste, página, rutas visibles y contratos HTTP de servicios. Cada TestBed activa explícitamente zoneless para reproducir la configuración real y verifica comportamiento observable, no detalles internos del framework.
