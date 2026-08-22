# 08. Ejecución multiplataforma

## Objetivo

El proyecto se inicia desde la raíz con un único launcher por familia de sistema operativo. Los launchers detectan las herramientas disponibles, crean `.env` desde `.env.example` cuando hace falta, preparan dependencias, arrancan los servicios y comprueban por HTTP que la API y el frontend respondan.

No se exige Docker si la máquina ya puede ejecutar de forma nativa .NET, Node.js y SQL Server. Docker se conserva como entorno reproducible cuando falta alguno de esos requisitos.

## Comando mínimo

### macOS, Linux y WSL

```bash
chmod +x start.sh
./start.sh
```

### Windows

Desde `cmd.exe` o mediante doble clic:

```bat
start.cmd
```

Desde PowerShell:

```powershell
.\start.ps1 -Mode Auto
```

`start.cmd` delega en `start.ps1` con una política de ejecución limitada únicamente a ese proceso; no modifica la política global del equipo.

## Algoritmo del modo automático

```text
Detectar sistema operativo
        |
        v
Leer/crear .env
        |
        v
¿.NET SDK 10 + Node 20/npm + SQL Server accesible?
       / \
     sí   no
     /     \
 Nativo   ¿Docker + Compose disponibles?
              / \
            sí   no
            /     \
         Docker   Error accionable con requisitos faltantes
```

En Windows, el launcher intenta iniciar automáticamente la instancia `MSSQLLocalDB` si encuentra `sqllocaldb`. En macOS, Linux y WSL no se adivinan credenciales ni servidores: se exige `NATIVE_DATABASE_CONNECTION` para evitar conectar o modificar por accidente una base ajena.

La selección puede controlarse mediante `RUN_MODE` en `.env` o mediante un argumento. El argumento siempre tiene prioridad.

## Matriz de ejecución

| Sistema | Modo automático | Nativo sin Docker | Docker |
| --- | --- | --- | --- |
| Windows 10/11 | LocalDB si están .NET y Node; de lo contrario Docker | .NET 10, Node 20+ y LocalDB o SQL Server configurado | Docker Desktop |
| macOS Intel | Conexión SQL configurada si existe; de lo contrario Docker | .NET 10, Node 20+ y SQL Server remoto | Docker Desktop |
| macOS Apple Silicon | Igual que macOS Intel | .NET 10, Node 20+ y SQL Server remoto | Docker Desktop con emulación de la imagen SQL x86-64 |
| Linux x86-64 | Conexión SQL configurada si existe; de lo contrario Docker | .NET 10, Node 20+ y SQL Server local soportado o remoto | Docker Engine + plugin Compose |
| Linux ARM64 | Conexión SQL remota si existe; de lo contrario Docker solo si el entorno admite la imagen | .NET 10, Node 20+ y SQL Server remoto | SQL Server oficial no publica una imagen ARM64 nativa |
| WSL 2 | Conexión SQL configurada si existe; de lo contrario Docker | .NET 10, Node 20+ y SQL Server accesible desde WSL | Docker Desktop con integración WSL |

### Límite técnico de macOS y ARM

Microsoft no distribuye SQL Server como proceso nativo para macOS. Además, las imágenes de contenedor oficiales de SQL Server se soportan en hosts Linux x86-64; la emulación o traducción de arquitectura no está soportada oficialmente. Docker Desktop logra ejecutar la imagen `linux/amd64` en Apple Silicon para desarrollo y esta solución se verificó de esa forma, pero una evaluación que exija una plataforma soportada debe usar Windows/x86-64, Linux x86-64 o un SQL Server remoto.

Referencias oficiales:

- [Instalar .NET en macOS](https://learn.microsoft.com/es-es/dotnet/core/install/macos)
- [SQL Server Express LocalDB](https://learn.microsoft.com/en-us/sql/database-engine/configure-windows/sql-server-express-localdb?view=sql-server-ver17)
- [Plataformas soportadas por SQL Server en Linux](https://learn.microsoft.com/en-us/sql/linux/install-upgrade/setup?view=sql-server-ver17)
- [Docker Desktop para macOS](https://docs.docker.com/desktop/setup/install/mac-install/)
- [Instalar Docker Engine en Linux](https://docs.docker.com/engine/install/)

## Modos y acciones

| Acción | macOS/Linux/WSL | Windows PowerShell |
| --- | --- | --- |
| Selección automática | `./start.sh` | `.\start.ps1` |
| Forzar Docker | `./start.sh --mode docker` | `.\start.ps1 -Mode Docker` |
| Forzar nativo | `./start.sh --mode native` | `.\start.ps1 -Mode Native` |
| Primer plano | `./start.sh --foreground` | `.\start.ps1 -Foreground` |
| Reusar imágenes | `./start.sh --mode docker --no-build` | `.\start.ps1 -Mode Docker -NoBuild` |
| Seguir logs | `./start.sh --logs` | `.\start.ps1 -Logs` |
| Estado | `./start.sh --status` | `.\start.ps1 -Status` |
| Detener | `./start.sh --stop` | `.\start.ps1 -Stop` |
| Ayuda | `./start.sh --help` | `.\start.ps1 -Help` |

`--stop`/`-Stop` conserva el volumen Docker de SQL Server. No elimina datos.

## Variables de `.env`

`.env.example` contiene valores de desarrollo funcionales. Al primer inicio se copia como `.env`, archivo ignorado por Git.

| Variable | Valor inicial | Responsabilidad |
| --- | --- | --- |
| `COMPOSE_PROJECT_NAME` | `agaval` | Prefijo estable para contenedores, red y volumen. |
| `RUN_MODE` | `auto` | Estrategia `auto`, `docker` o `native`. |
| `FRONTEND_PORT` | `4200` | Puerto publicado por Angular/Nginx. |
| `BACKEND_PORT` | `5100` | Puerto publicado por ASP.NET Core. |
| `SQLSERVER_PORT` | `1433` | Puerto SQL publicado por Compose. |
| `SQLSERVER_IMAGE` | `mcr.microsoft.com/mssql/server:2022-latest` | Imagen de SQL Server. |
| `SQLSERVER_PLATFORM` | `linux/amd64` | Plataforma de la imagen oficial. |
| `MSSQL_PID` | `Developer` | Edición local sin costo de licencia para desarrollo. |
| `MSSQL_SA_PASSWORD` | valor de desarrollo | Clave usada únicamente por el stack local Compose. |
| `DATABASE_NAME` | `GestorInventarioDB` | Base que crea EF Core mediante migraciones. |
| `ASPNETCORE_ENVIRONMENT` | `Production` | Ambiente del contenedor API. |
| `APPLY_MIGRATIONS_ON_STARTUP` | `true` | Aplica migración y seed durante el arranque local. |
| `PUBLIC_HOST` | `localhost` | Host mostrado en las URLs finales. |
| `NATIVE_DATABASE_CONNECTION` | vacío | Conexión SQL para ejecución nativa; en Windows puede suplirla LocalDB. |

El password publicado es deliberadamente una credencial local de ejemplo, no un secreto productivo. Antes de desplegar se debe suministrar mediante el gestor de secretos de la plataforma y rotarlo.

## Ejecución nativa

### Windows con LocalDB

Instalar:

1. .NET SDK 10;
2. Node.js 20 o superior con npm;
3. SQL Server Express LocalDB.

Después ejecutar `start.cmd`. El launcher inicia `MSSQLLocalDB`, establece autenticación integrada y deja que EF Core cree `GestorInventarioDB`, aplique la migración y cargue el seed.

### macOS, Linux o SQL Server externo

Definir una conexión en `.env`:

```dotenv
RUN_MODE=native
NATIVE_DATABASE_CONNECTION=Server=localhost,1433;Database=GestorInventarioDB;User Id=sa;Password=SU_CLAVE;Encrypt=True;TrustServerCertificate=True
```

La cuenta debe tener permisos para crear/actualizar la base durante desarrollo. En un entorno real se recomienda que las migraciones sean un paso de despliegue separado y que la identidad de runtime tenga privilegios mínimos.

El modo nativo:

1. valida versiones de .NET y Node;
2. ejecuta `dotnet restore`;
3. ejecuta `npm ci` solo si faltan dependencias o cambió el lockfile;
4. genera `.run/proxy.native.json` para `/api`;
5. inicia backend y frontend;
6. guarda PID y logs en `.run/`;
7. espera `/health` y la página principal antes de declarar éxito.

En macOS/Linux los logs son `.run/backend.log` y `.run/frontend.log`. En Windows se separan stdout/stderr en cuatro archivos `*.out.log` y `*.err.log`.

## Ejecución con Docker

Docker es el camino más reproducible y solo requiere Docker Desktop o Docker Engine con Compose:

```bash
./start.sh --mode docker
```

Compose crea:

- SQL Server 2022 con health check y volumen persistente;
- la API compilada en una imagen multi-stage;
- el frontend Angular compilado y servido por Nginx;
- una red privada en la que la API se conecta a `sqlserver`;
- migración y seed idempotentes antes de aceptar tráfico.

URLs predeterminadas:

- Frontend: `http://localhost:4200`
- API: `http://localhost:5100`
- Health check: `http://localhost:5100/health`
- Swagger en modo Development: `http://localhost:5100/swagger`

Swagger no se habilita en el contenedor `Production`; se puede probar el contrato con el archivo `backend/src/Agaval.Inventory.Api/Agaval.Inventory.Api.http`.

## Migración, creación y seed

No se comprueba la existencia de tablas una a una. EF Core mantiene `__EFMigrationsHistory` y ejecuta las migraciones pendientes mediante `MigrateAsync`. Este enfoque es determinista, versionable e idempotente:

- primera ejecución: crea la base, tablas, restricciones, índices y datos de referencia;
- siguientes ejecuciones: no repite migraciones ni duplica el seed;
- nueva versión: aplica únicamente migraciones todavía no registradas.

Si alguien elimina manualmente una tabla pero conserva `__EFMigrationsHistory`, la aplicación no la reconstruye silenciosamente porque podría ocultar corrupción o destruir información. Se debe restaurar la base o aplicar una reparación controlada.

## Diagnóstico

### Puerto ocupado

Cambiar el puerto en `.env`, por ejemplo:

```dotenv
FRONTEND_PORT=4300
BACKEND_PORT=5200
SQLSERVER_PORT=14330
```

No hay que editar código: el launcher actualiza CORS, proxy y URLs con esos valores.

### Docker instalado pero detenido

En macOS y Windows el launcher intenta abrir Docker Desktop y espera hasta dos minutos. En Linux se debe iniciar el servicio según la distribución, normalmente:

```bash
sudo systemctl start docker
```

### La API no inicia

Consultar primero:

```bash
./start.sh --status
./start.sh --logs
```

En Windows:

```powershell
.\start.ps1 -Status
.\start.ps1 -Logs
```

Las causas habituales son conexión SQL inválida, contraseña que no cumple la política de SQL Server, puerto ocupado o permisos insuficientes para migrar.

### PowerShell bloquea scripts

Usar `start.cmd`, que aplica `-ExecutionPolicy Bypass` solo al proceso lanzado. No es necesario cambiar la política permanente del equipo.

### WSL no encuentra Docker

Habilitar la integración de la distribución en Docker Desktop y comprobar desde WSL:

```bash
docker info
docker compose version
```

### Reinicio completo de datos Docker

Esta operación sí elimina la base local y debe ser deliberada:

```bash
docker compose down --volumes
./start.sh --mode docker
```

En PowerShell:

```powershell
docker compose down --volumes
.\start.ps1 -Mode Docker
```

## Criterio de soporte

El launcher informa un error accionable si no existe ni un camino nativo completo ni Docker. No intenta instalar silenciosamente software del sistema, aceptar licencias o solicitar privilegios administrativos. La instalación de dependencias externas sigue siendo una decisión visible del dueño de la máquina; una vez instaladas, el proyecto prepara automáticamente sus dependencias de aplicación y su base de desarrollo.
