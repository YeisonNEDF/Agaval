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
- creación, edición, protección de una categoría en uso y eliminación física;
- credenciales inválidas, emisión JWT y autorización por rol;
- búsqueda, paginación, ordenamiento, resumen e historial por HTTP;
- validación de Commands;
- orquestación de Create con repositorios dobles;
- ciclo HTTP funcional completo a través de controllers, MediatR y FluentValidation;
- regla de dependencias entre proyectos.

## Frontend

Comandos de verificación:

```bash
npm run lint
npm test -- --watch=false --browsers=ChromeHeadless
npm run build
npm audit
```

Las 38 pruebas cubren los 16 componentes, shell, navegación visible, nombres accesibles para acciones, configuración de diálogos dentro del viewport, filtros/página/orden sincronizados con URL, interceptor JWT, rutas lazy y contratos HTTP de productos, categorías y movimientos. Se revisa además la ausencia de los anti-patrones expresos del estándar mediante búsqueda estática.

## Validación funcional en navegador

Se ejecutó el artefacto Docker completo contra SQL Server real y se comprobó desde el navegador:

- render de dashboard, filtros y tabla;
- iconografía y fuente Manrope local;
- navegación directa entre `/productos` y `/productos/stock-bajo`;
- apertura y validación del formulario en viewport móvil;
- formulario de producto sin desbordamiento en 762 × 768 y 390 × 844;
- diálogo de stock completo, con cierre y acción principal visibles en móvil;
- creación y edición de un producto temporal, reflejadas en métricas y tabla;
- entrada de inventario, cambio de stock y transición de `Stock bajo` a `Normal`;
- eliminación desde el diálogo de confirmación y retorno exacto al seed original;
- layout de 390 px sin scrollbar horizontal global;
- listado transformado en tarjetas legibles y sin scroll horizontal en móvil;
- layout de escritorio;
- consola sin errores ni warnings durante el flujo.

Además se repitió por HTTP, atravesando el reverse proxy del frontend, el ciclo crear, consultar, editar, listar stock bajo, ajustar y eliminar. Se verificaron 201, 200, 204 y 404, junto con respuestas 400 para datos inválidos y una salida superior a las existencias. En Development y Compose la migración se aplica automáticamente cuando SQL Server está disponible.

## Resultado registrado

La pasada final debe mantener:

- Backend: 16 tests aprobados, 0 fallidos.
- Frontend: 38 tests aprobados, 0 fallidos.
- Build .NET Release: 0 warnings y 0 errores.
- Lint Angular: sin hallazgos.
- Build Angular production: exitoso.
- Dependencias: sin vulnerabilidades conocidas reportadas por los gestores.
- Modelo EF Core: sin cambios pendientes frente a la migración SQL Server.
- E2E desplegable: Angular/Nginx, proxy `/api`, JWT/CQRS, API y SQL Server completaron el ciclo funcional.

Los archivos YAML de CI, despliegue, Compose y Kubernetes fueron parseados correctamente. Los dos módulos Bicep de Azure se validaron con la CLI oficial. En la estación de validación se instaló Docker 29.7.2 con Compose 5.4.0 y se realizó una prueba integral del artefacto base:

- construcción multi-stage de las imágenes de backend y frontend;
- SQL Server en estado `healthy`;
- aplicación de la migración inicial y carga idempotente del seed;
- `GET /health` con HTTP 200;
- `GET /api/productos` y `GET /api/categorias` con HTTP 200 y datos persistidos;
- frontend servido por Nginx con HTTP 200;
- conectividad frontend -> reverse proxy -> API -> SQL Server.
- ciclo CRUD y ajuste de stock real, con limpieza del registro temporal al finalizar.

También se validó el modo nativo en macOS con .NET SDK 10.0.400 y Node.js 22.19, usando la instancia SQL del contenedor como servicio externo temporal. El launcher inició ambos procesos, y respondieron HTTP 200 `/health`, productos, categorías, frontend y el proxy `/api`; el seed devolvió 2 productos y 3 categorías y no se registraron errores en los logs.

El launcher PowerShell se ejecutó con PowerShell 7.6.5 siguiendo el mismo recorrido nativo. Se verificaron inicio, health checks, paso de una ruta con espacios al proxy, respuestas HTTP 200, detección de PID con `-Status` y cierre limpio con `-Stop`. La detección concreta de LocalDB debe validarse en Windows, ya que LocalDB no existe en macOS.

La instalación asistida añadió verificaciones no destructivas `--check`/`-Check -NoInstall`. Localmente se validaron la sintaxis POSIX, el diagnóstico shell, el parseo completo de PowerShell 7.6.2, su diagnóstico y la resolución de Compose. CI ejecuta `start.ps1`, `start.cmd` y `start.sh` sobre `windows-latest`. Después inicia realmente el stack nativo desde Git Bash con .NET 10, Node 24 y LocalDB, exige HTTP 200 de API, frontend y proxy Angular, imprime los cuatro logs si algo falla y detiene los procesos siempre. La rama que invoca WinGet queda deliberadamente fuera de CI porque cambiaría el sistema anfitrión y puede requerir elevación o reinicio.

El arranque, las solicitudes HTTP y el cierre se mantienen dentro del mismo step de Windows. Esto evita que la limpieza de procesos huérfanos del runner elimine los servidores iniciados en background antes de realizar las comprobaciones; un `trap` garantiza el cierre aun cuando una solicitud falle.

Después de reproducir un fallo de detección en Windows con Node 25, se eliminó la evaluación JavaScript usada para obtener la versión y se reemplazó por `node --version`. El diagnóstico se verificó con Node 22.19.0 y se declaró en `package.json` el rango oficial de Angular 20.3. La pasada actual mantiene lint limpio, 38 pruebas frontend aprobadas y build de producción exitoso.

La sección opcional se verificó con tests funcionales en memoria y con `scripts/e2e-smoke.mjs` contra el stack Docker y SQL Server real. El recorrido atraviesa Nginx, proxy Angular, ASP.NET Core, JWT, Controllers, MediatR, FluentValidation, Handlers y EF Core; cubre 401 sin token, login válido/inválido, CRUD de categorías con 409 por duplicado y por integridad referencial, eliminación física, consulta paginada/ordenada de productos, stock bajo, resumen y movimientos de entrada/salida.

Una segunda reproducción en Git Bash con Node 24.19 mostró que el primer diagnóstico era correcto, pero la validación redundante previa al arranque podía perder la resolución de `npm.cmd`. El inicio nativo ahora conserva el diagnóstico ya validado y, como respaldo, busca `npm.cmd` en el mismo directorio de `node.exe`. Git Bash establece además la página de códigos UTF-8 antes de delegar en Windows PowerShell.

La reproducción posterior mostró un timeout de API que continuaba indebidamente hacia el frontend. La salida de `Show-Diagnostics` contaminaba el pipeline de PowerShell y convertía el `false` final en una colección evaluada como verdadera. Los diagnósticos ahora se envían exclusivamente al host y los health checks comparan explícitamente con `$true`; cualquier timeout detiene los procesos, persiste el error y devuelve código distinto de cero. En modo nativo también se vigila cada proceso: si `dotnet` o Angular terminan antes de responder, la espera se corta inmediatamente y los logs se muestran después de cerrar los procesos para capturar toda su salida.

La prueba Docker se ejecutó en macOS Apple Silicon mediante emulación `linux/amd64`. Es válida como evidencia funcional de desarrollo, pero no convierte esa combinación en una plataforma SQL Server soportada oficialmente por Microsoft; la distinción se explica en `Doc/08-ejecucion-multiplataforma.md`.

Si una ejecución posterior cambia estos valores, el resultado de CI es la fuente de verdad y debe corregirse antes de desplegar.

## Evoluciones productivas recomendadas

- E2E visual Playwright en CI además del E2E contractual actual;
- concurrencia optimista al ajustar stock;
- cobertura de actualización y eliminación en Application;
- prueba del migration bundle contra una instancia SQL Server de staging.
