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

Los seis archivos YAML de CI, Compose y Kubernetes fueron parseados correctamente. No se construyeron las imágenes en esta estación porque el ejecutable Docker no está instalado; los builds nativos de los dos artefactos sí se completaron.

Si una ejecución posterior cambia estos valores, el resultado de CI es la fuente de verdad y debe corregirse antes de desplegar.

## Casos siguientes recomendados

- pruebas de integración API + SQL Server efímero;
- test E2E Playwright en CI;
- concurrencia optimista al ajustar stock;
- cobertura de actualización y eliminación en Application;
- prueba del migration bundle contra una instancia SQL Server de staging.
