# 06. Pruebas y calidad

## Estrategia

La solución aplica controles en varias capas:

1. compiladores estrictos y warnings como errores;
2. validación estática con analyzers .NET, TypeScript y ESLint Angular;
3. pruebas unitarias de dominio, Application y componentes;
4. auditoría de dependencias NuGet y npm;
5. build de producción de ambos artefactos;
6. revisión funcional y responsive en navegador real.

## Backend

Comandos de verificación:

```bash
dotnet format Agaval.Inventory.slnx --verify-no-changes --no-restore
dotnet build Agaval.Inventory.slnx --configuration Release
dotnet test Agaval.Inventory.slnx --configuration Release --no-build
dotnet list Agaval.Inventory.slnx package --vulnerable --include-transitive
dotnet ef migrations has-pending-model-changes \
  --project src/Agaval.Inventory.Infrastructure \
  --startup-project src/Agaval.Inventory.Api
```

Cobertura de comportamiento:

- invariantes del producto y stock bajo;
- entradas y salidas válidas;
- rechazo de una salida que dejaría stock negativo;
- validación de Commands;
- orquestación de Create con repositorios dobles;
- regla de dependencias entre proyectos.

## Frontend

Comandos de verificación:

```bash
npm run lint
npm test -- --watch=false --browsers=ChromeHeadless
npm run build
npm audit
```

Los 15 specs prueban componentes, shell y rutas HTTP de servicios. Se revisa además la ausencia de los anti-patrones expresos del estándar mediante búsqueda estática.

## Validación funcional en navegador

Se ejecutó Angular contra una API local controlada con el mismo contrato HTTP y se comprobó:

- render de dashboard, filtros y tabla;
- iconografía y fuentes locales;
- apertura y validación del formulario en viewport móvil;
- creación de `Mouse ergonómico`, reflejada en el contador y la tabla;
- entrada de una unidad, con cambio de stock de 8 a 9;
- layout de 390 px sin scrollbar horizontal global;
- tabla con scroll horizontal contenido en móvil;
- layout de escritorio;
- consola sin errores ni warnings durante el flujo.

La ejecución real de la migración requiere una instancia SQL Server. En Development y Compose se aplica automáticamente cuando el motor está disponible.

## Resultado registrado

La pasada final debe mantener:

- Backend: 11 tests aprobados, 0 fallidos.
- Frontend: 15 tests aprobados, 0 fallidos.
- Build .NET Release: 0 warnings y 0 errores.
- Lint Angular: sin hallazgos.
- Build Angular production: exitoso.
- Dependencias: sin vulnerabilidades conocidas reportadas por los gestores.
- Modelo EF Core: sin cambios pendientes frente a la migración SQL Server.
- Smoke test de API: `/health` y OpenAPI respondieron HTTP 200 con migraciones desactivadas.

Los seis archivos YAML de CI, Compose y Kubernetes fueron parseados correctamente. En la estación de validación se instaló Docker 29.7.2 con Compose 5.4.0 y se realizó una prueba integral del artefacto:

- construcción multi-stage de las imágenes de backend y frontend;
- SQL Server en estado `healthy`;
- aplicación de la migración inicial y carga idempotente del seed;
- `GET /health` con HTTP 200;
- `GET /api/productos` y `GET /api/categorias` con HTTP 200 y datos persistidos;
- frontend servido por Nginx con HTTP 200;
- conectividad frontend -> reverse proxy -> API -> SQL Server.

También se validó el modo nativo en macOS con .NET SDK 10.0.400 y Node.js 22.19, usando la instancia SQL del contenedor como servicio externo temporal. El launcher inició ambos procesos, y respondieron HTTP 200 `/health`, productos, categorías, frontend y el proxy `/api`; el seed devolvió 2 productos y 3 categorías y no se registraron errores en los logs.

El launcher PowerShell se ejecutó con PowerShell 7.6.5 siguiendo el mismo recorrido nativo. Se verificaron inicio, health checks, paso de una ruta con espacios al proxy, respuestas HTTP 200, detección de PID con `-Status` y cierre limpio con `-Stop`. La detección concreta de LocalDB debe validarse en Windows, ya que LocalDB no existe en macOS.

La prueba Docker se ejecutó en macOS Apple Silicon mediante emulación `linux/amd64`. Es válida como evidencia funcional de desarrollo, pero no convierte esa combinación en una plataforma SQL Server soportada oficialmente por Microsoft; la distinción se explica en `Doc/08-ejecucion-multiplataforma.md`.

Si una ejecución posterior cambia estos valores, el resultado de CI es la fuente de verdad y debe corregirse antes de desplegar.

## Casos siguientes recomendados

- pruebas de integración API + SQL Server efímero;
- test E2E Playwright en CI;
- concurrencia optimista al ajustar stock;
- cobertura de actualización y eliminación en Application;
- prueba del migration bundle contra una instancia SQL Server de staging.
