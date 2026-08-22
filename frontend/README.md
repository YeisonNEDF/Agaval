# Frontend AGAVAL

Cliente Angular 20 standalone, zoneless, OnPush y basado en Signals para el gestor de inventario.

```bash
npm ci
npm start
```

El servidor queda en `http://localhost:4200` y `proxy.conf.json` redirige `/api` al backend en `http://localhost:5100`.

```bash
npm run lint
npm test -- --watch=false --browsers=ChromeHeadless
npm run build
```

Consulte el desglose técnico de la interfaz en [`Doc/frontend.md`](Doc/frontend.md).
