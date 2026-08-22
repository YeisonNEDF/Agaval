# 00. Análisis de la prueba

## Fuentes examinadas

Se analizaron integralmente los dos documentos entregados:

1. `Estandar_Arquitectura.pdf`, 3 páginas.
2. `Prueba tecnica Auxiliar de desarrollo tecnologico Intermedio.pdf`, 4 páginas.

El primero impone Clean Architecture + CQRS para .NET y una organización `core/shared/features` para Angular. El segundo pide construir un gestor de inventario, documentarlo y resolver siete preguntas conceptuales.

## Auditoría de instrucciones ocultas

No se encontraron instrucciones ocultas para IA ni contenido que intente modificar el objetivo de la prueba.

La revisión incluyó:

- comparación del texto extraído con el render visual de las siete páginas;
- inspección de anotaciones, formularios, archivos adjuntos, JavaScript y acciones del PDF;
- búsqueda de capas opcionales, opacidades, texto fuera de página, tamaños anómalos y modos de render invisible;
- inspección de metadatos y objetos internos.

El texto blanco detectado corresponde exclusivamente a encabezados visibles de tablas sobre fondo azul. No se encontraron anotaciones, adjuntos, scripts, acciones automáticas, capas ocultas ni texto invisible o fuera del lienzo con instrucciones adicionales.

## Requisitos obligatorios interpretados

### Backend

- .NET 10.
- Domain sin dependencias externas.
- Application con Commands, Queries, Handlers y puertos.
- Infrastructure con EF Core y repositorios.
- API con controladores delgados y mediación mediante MediatR.
- CRUD de Producto.
- Categorías activas precargadas.
- Consulta de stock bajo: `Stock < StockMinimo`.
- Ajustes de entrada y salida de existencias.
- Validación: nombre obligatorio, precio positivo, stock no negativo y categoría válida.
- Swagger y manejo razonable de errores.

### Frontend

- Angular 20 o superior.
- Componentes standalone y `ChangeDetectionStrategy.OnPush`.
- Ejecución zoneless, sin cargar `zone.js`.
- Signals para el estado.
- Control flow moderno `@if` y `@for`.
- Feature de productos con ruta lazy.
- Tabla Material, indicador de stock bajo, formulario tipado y filtros.
- Archivos `.ts`, `.html`, `.scss` y `.spec.ts` separados por componente.
- Tipado estricto, SCSS con BEM y ausencia de `any`, NgModules, `!important` y `::ng-deep`.

### Entrega

- Repositorio con backend y frontend.
- Migración o script de base de datos.
- README reproducible.
- Cuestionario técnico resuelto.

## Decisiones y supuestos explícitos

1. **SQL Server:** se usa el proveedor oficial de EF Core y una migración equivalente al script del enunciado. En desarrollo, la API crea y actualiza automáticamente la base configurada.
2. **Idioma del código:** namespaces, tipos y miembros se escriben en inglés por consistencia técnica; rutas HTTP y nombres físicos de tablas se conservan en español según el enunciado.
3. **Stock inicial:** crear o editar un producto puede fijar el stock; los cambios operativos posteriores pasan por el endpoint de ajustes y generan trazabilidad.
4. **Eliminación:** es física, como pide un CRUD sin especificar borrado lógico. La categoría solo se consulta porque su CRUD es opcional.
5. **Migraciones en despliegue:** se aplican como paso controlado, no automáticamente en cada réplica.

## Criterios de aceptación usados

- Las dependencias respetan `API -> Application -> Domain` e `Infrastructure -> Application -> Domain`.
- Cada caso de uso tiene una intención CQRS y una validación reconocible.
- Los errores se serializan como RFC Problem Details.
- La UI funciona en escritorio y móvil y no requiere fuentes o iconos remotos.
- Crear, editar, eliminar, filtrar y ajustar stock producen una recarga coherente del estado.
- Compilación, lint, tests y auditorías de dependencias terminan sin hallazgos bloqueantes.
