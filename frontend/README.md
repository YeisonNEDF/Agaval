# Frontend AGAVAL

Cliente Angular 20 standalone, zoneless, OnPush y basado en Signals para el gestor de inventario.

```bash
npm ci
npm start
```

El servidor queda en `http://localhost:4200` y `proxy.conf.json` redirige `/api` al backend en `http://localhost:5100`.

Rutas disponibles:

- `/productos`: inventario con búsqueda, filtros, orden y paginación de servidor.
- `/productos/stock-bajo`: vista enfocada en alertas de existencias.
- `/movimientos`: historial paginado de entradas y salidas.
- `/categorias`: CRUD protegido y cargado de forma lazy.
- `/login`: inicio de sesión requerido para entrar a la aplicación.

Todas las rutas de inventario están protegidas por guard; únicamente `/login` es pública y redirige a `/productos` cuando ya existe una sesión válida. El cierre, la expiración del token o una respuesta 401 abandonan inmediatamente la feature protegida.

Credenciales disponibles para el revisor:

```text
URL: http://localhost:4200/login
Usuario: admin
Contraseña: Agaval_admin_2026!
```

El token se conserva en `sessionStorage`, se elimina al expirar y un interceptor lo adjunta solamente a las llamadas `/api`.

## Respuestas del cuestionario - Frontend

### ¿Por qué componentes standalone en lugar de NgModules y qué ventaja ofrecen al lazy loading?

Standalone hace explícitas las dependencias de cada componente y elimina módulos utilizados únicamente como contenedores de registro. Reduce configuración accidental, mejora el tree shaking y permite importar directamente componentes, pipes y providers donde se necesitan.

Una ruta puede cargar una feature o componente con `loadChildren` o `loadComponent` sin crear un NgModule intermedio. Así, el chunk coincide con la ruta y sus dependencias reales, los providers pueden limitarse a ese scope y la propiedad del estado resulta más clara.

### ¿Por qué `ChangeDetectionStrategy.OnPush` y qué implica al actualizar datos?

`OnPush` evita revisar indiscriminadamente todo el árbol. El componente se actualiza cuando cambia un input por referencia, ocurre un evento propio, una fuente reactiva notifica o se solicita detección explícita. Con Signals y zoneless, Angular conoce los consumidores del estado y actualiza solo los necesarios.

Por ello el estado debe tratarse como inmutable y observable. No se mutan silenciosamente arrays u objetos conservando la referencia; se emplean `signal.set`, `signal.update`, `computed` o nuevos valores de input. Las operaciones asíncronas deben publicar explícitamente el nuevo estado.

```bash
npm run lint
npm test -- --watch=false --browsers=ChromeHeadless
npm run build
```

La última ejecución aprobó 50 pruebas. Los 16 componentes tienen sus archivos `.ts`, `.html`, `.scss` y `.spec.ts` colocados en la misma carpeta.
