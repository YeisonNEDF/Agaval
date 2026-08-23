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

La cuenta de evaluación es `admin` / `Agaval_admin_2026!`. El token se conserva en `sessionStorage`, se elimina al expirar y un interceptor lo adjunta solamente a las llamadas `/api`.

```bash
npm run lint
npm test -- --watch=false --browsers=ChromeHeadless
npm run build
```

La última ejecución aprobó 50 pruebas. Los 16 componentes tienen sus archivos `.ts`, `.html`, `.scss` y `.spec.ts` colocados en la misma carpeta. Consulte el desglose técnico general en [`../Doc/03-frontend.md`](../Doc/03-frontend.md) y los extras en [`../Doc/09-funcionalidades-opcionales.md`](../Doc/09-funcionalidades-opcionales.md).
