# 05. Cuestionario técnico

## Backend 1

**¿Por qué `ProductosController` no debe acceder directamente al `PersistenceContext`, sino pasar por Handlers de Application?**

Porque el controlador pertenece a la capa de presentación: su responsabilidad es traducir HTTP, no decidir reglas ni coordinar persistencia. Al enviar un Command o Query, el caso de uso queda disponible desde cualquier entrada —HTTP, worker, CLI o test— sin duplicar comportamiento.

Se gana separación de responsabilidades, inversión de dependencias y testabilidad. Application depende de puertos, no de EF Core; por eso una prueba puede sustituir repositorios sin levantar SQL Server. También se centralizan validación, autorización futura, logging y transacciones mediante behaviors. El DbContext directo parece más corto al principio, pero acopla contrato HTTP, reglas y tecnología; cada cambio aumenta el controlador y hace más difícil sustituir EF, probar casos límite o reutilizar el caso de uso.

## Backend 2

**Si al crear un producto con stock bajo debe notificarse por correo, ¿por qué no hacerlo directamente en `CrearProductoCommandHandler`?**

Enviar correo es un efecto externo distinto de persistir el producto. Incrustarlo en el Handler viola responsabilidad única, acopla el caso de uso a un proveedor y crea una transacción ambigua: si el producto se guarda y el correo falla, no es claro si se debe devolver error, reintentar o duplicar el producto.

Elegiría un evento de dominio/integración `ProductCreatedWithLowStock` y un Handler independiente que encole la notificación. Para confiabilidad usaría el patrón Outbox: producto y evento se confirman en la misma transacción; un worker publica y reintenta el correo de forma idempotente. Esto aplica SRP, Open/Closed e inversión de dependencias, y separa consistencia transaccional de consistencia eventual.

## Frontend 1

**¿Por qué componentes standalone en lugar de NgModules y qué ventaja dan al lazy loading?**

Standalone hace explícitas las dependencias de cada componente y elimina módulos usados solo como contenedores de registro. Reduce configuración accidental, mejora el tree shaking y permite importar directamente componentes, pipes y providers donde se necesitan.

Para lazy loading, una ruta puede cargar directamente una feature o componente con `loadChildren`/`loadComponent`, sin crear un NgModule intermedio. El límite del chunk coincide con la ruta y sus dependencias reales; sus providers pueden vivir en ese scope y destruirse al salir. Esto simplifica tanto el grafo de compilación como la propiedad del estado.

## Frontend 2

**¿Por qué OnPush y qué implica al actualizar datos?**

OnPush evita revisar indiscriminadamente todo el árbol en cada ciclo. El componente se actualiza cuando cambia un input por referencia, ocurre un evento propio, una fuente reactiva notifica o se solicita detección explícita. Con Signals y zoneless, esa notificación es precisa: el template registra qué signals consume y Angular actualiza solo los consumidores afectados.

La implicación práctica es tratar el estado como inmutable y observable. No se debe mutar silenciosamente un array u objeto manteniendo la misma referencia; se usa `signal.set`, `signal.update`, `computed` o un nuevo valor de input. Las operaciones asíncronas que no estén integradas con Signals requieren publicar explícitamente el nuevo estado.

## CI/CD, Docker y Kubernetes 1

**¿Por qué versionar recursos Kubernetes en YAML en lugar de crearlos manualmente?**

Los manifiestos convierten la infraestructura en código: permiten revisión por pull request, historial, comparación entre ambientes, repetibilidad y automatización. El estado deseado puede aplicarse de forma declarativa e idempotente y auditarse junto con la versión de aplicación.

`kubectl create` manual deja conocimiento en la terminal de una persona, favorece drift y hace difícil reconstruir un clúster o explicar quién cambió réplicas, probes o límites. Los secretos reales siguen fuera de Git; el YAML referencia un Secret administrado por la plataforma.

## CI/CD, Docker y Kubernetes 2

**¿Por qué una imagen Docker en lugar del artefacto compilado en una VM?**

Una imagen empaqueta artefacto, runtime, dependencias del sistema y configuración base en una unidad inmutable. El mismo digest probado en CI se ejecuta en staging y producción, reduciendo el problema “funciona en mi máquina” y la deriva entre servidores.

Además facilita rollback, aislamiento, escalado y scheduling. Containerizar no elimina la configuración externa ni la observabilidad, pero fija el entorno de ejecución. Copiar solo el binario a una VM depende de que cada servidor tenga exactamente el runtime, librerías y configuración esperados.

## CI/CD, Docker y Kubernetes 3

**¿Por qué separar Build de Release/Deploy?**

Build debe producir una vez un artefacto inmutable, ejecutar análisis y tests y publicar su digest. Release toma exactamente ese artefacto aprobado y lo promueve sin recompilar. La separación permite aprobaciones, ventanas de despliegue, controles por ambiente y rollback a una versión conocida.

Mitiga que una compilación no verificada llegue a producción y que el artefacto desplegado difiera del probado. También limita credenciales: el job de build no necesita acceso al clúster, y el job de deploy puede tener permisos mínimos y protección de entorno. Un único job que compila y despliega amplía el radio de impacto de un fallo o compromiso.
