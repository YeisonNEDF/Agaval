# 08. Ejecución multiplataforma

## Objetivo

El proyecto se inicia desde la raíz con un único launcher por familia de sistema operativo. Los launchers detectan las herramientas disponibles, crean `.env` desde `.env.example` cuando hace falta, preparan dependencias, arrancan los servicios y comprueban por HTTP que la API y el frontend respondan. En Windows, PowerShell también puede completar con WinGet los requisitos que admiten una instalación segura y repetible.

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

Al abrir `start.cmd` se ve primero un diagnóstico. Si falta una ruta ejecutable, el launcher anuncia el paquete exacto, lo instala con WinGet, actualiza el `PATH` del proceso y repite la comprobación. El instalador puede mostrar una solicitud de administrador. Si Windows requiere cerrar la terminal, completar WSL 2 o reiniciar, el mensaje final indica el siguiente paso y `start.cmd` mantiene la ventana abierta.

Cuando `start.sh` se ejecuta mediante Git Bash/MSYS/Cygwin, delega en PowerShell sin perder el código de salida. Ante un fallo, conserva la ventana hasta que se presione Enter y señala `.run/launcher-error.log`, donde queda el mensaje completo con fecha y modo solicitado. La salida de Windows se configura en UTF-8 para preservar los acentos.

## Algoritmo del modo automático

```text
Detectar sistema operativo
        |
        v
Leer/crear .env
        |
        v
¿.NET SDK 10 + Node compatible/npm + SQL Server accesible?
       / \
     sí   no
     /     \
 Nativo   ¿Docker + Compose disponibles?
              / \
            sí   no
            /     \
         Docker   Windows: instalar Docker Desktop con WinGet
                  macOS/Linux: error accionable
```

En Windows, el launcher intenta iniciar automáticamente la instancia `MSSQLLocalDB` si encuentra `sqllocaldb`. En macOS, Linux y WSL no se adivinan credenciales ni servidores: se exige `NATIVE_DATABASE_CONNECTION` para evitar conectar o modificar por accidente una base ajena.

Si Windows ya tiene LocalDB o `NATIVE_DATABASE_CONNECTION`, pero faltan .NET o Node.js, el modo `Auto` instala esas herramientas y conserva la ejecución nativa. Si falta también el motor SQL, instala Docker Desktop como una única ruta reproducible. No intenta automatizar el asistente de LocalDB porque Microsoft lo publica como una característica seleccionable de SQL Server Express; forzar esa selección podría alterar una instalación SQL existente.

La selección puede controlarse mediante `RUN_MODE` en `.env` o mediante un argumento. El argumento siempre tiene prioridad.

## Matriz de ejecución

| Sistema | Modo automático | Nativo sin Docker | Docker |
| --- | --- | --- | --- |
| Windows 10/11 | LocalDB si están .NET y Node; de lo contrario Docker | .NET 10, Node 20.19+/22.12+/24.x y LocalDB o SQL Server configurado | Docker Desktop |
| macOS Intel | Conexión SQL configurada si existe; de lo contrario Docker | .NET 10, Node 20.19+/22.12+/24.x y SQL Server remoto | Docker Desktop |
| macOS Apple Silicon | Igual que macOS Intel | .NET 10, Node 20.19+/22.12+/24.x y SQL Server remoto | Docker Desktop con emulación de la imagen SQL x86-64 |
| Linux x86-64 | Conexión SQL configurada si existe; de lo contrario Docker | .NET 10, Node 20.19+/22.12+/24.x y SQL Server local soportado o remoto | Docker Engine + plugin Compose |
| Linux ARM64 | Conexión SQL remota si existe; de lo contrario Docker solo si el entorno admite la imagen | .NET 10, Node 20.19+/22.12+/24.x y SQL Server remoto | SQL Server oficial no publica una imagen ARM64 nativa |
| WSL 2 | Conexión SQL configurada si existe; de lo contrario Docker | .NET 10, Node 20.19+/22.12+/24.x y SQL Server accesible desde WSL | Docker Desktop con integración WSL |

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
| Diagnosticar sin iniciar | `./start.sh --check` | `.\start.ps1 -Check` |
| Impedir instalaciones | `./start.sh --no-install` | `.\start.ps1 -NoInstall` |
| Seguir logs | `./start.sh --logs` | `.\start.ps1 -Logs` |
| Estado | `./start.sh --status` | `.\start.ps1 -Status` |
| Detener | `./start.sh --stop` | `.\start.ps1 -Stop` |
| Ayuda | `./start.sh --help` | `.\start.ps1 -Help` |

`--stop`/`-Stop` conserva el volumen Docker de SQL Server. No elimina datos.

## Variables de `.env`

`.env.example` contiene valores de desarrollo funcionales y el repositorio incluye también `.env` para una evaluación inmediata. Esta es una decisión explícita del ejercicio; esos valores nunca deben reutilizarse como secretos productivos.

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
| `AUTH_ISSUER` | `Agaval.Inventory.Api` | Emisor JWT aceptado. |
| `AUTH_AUDIENCE` | `Agaval.Inventory.Frontend` | Audiencia JWT aceptada. |
| `AUTH_JWT_SIGNING_KEY` | clave local de ejemplo | Firma HMAC; requiere al menos 32 caracteres. |
| `AUTH_USERNAME` | `admin` | Usuario local configurable. |
| `AUTH_PASSWORD` | clave local de evaluación | Contraseña para habilitar escrituras. |
| `AUTH_ROLE` | `InventoryManager` | Rol requerido por la política de escritura. |
| `AUTH_TOKEN_LIFETIME_MINUTES` | `120` | Vigencia de la sesión. |

Los passwords y la firma publicados son deliberadamente credenciales locales de ejemplo, no secretos productivos. Antes de desplegar se deben reemplazar, rotar y suministrar mediante el gestor de secretos de la plataforma.

## Ejecución nativa

### Windows con LocalDB

La forma automática recomendada es ejecutar `start.cmd`: si no encuentra una ruta nativa completa, preparará Docker Desktop. Para exigir el modo nativo se puede usar:

```powershell
.\start.ps1 -Mode Native
```

El launcher instala con WinGet .NET SDK 10 y Node.js LTS si hacen falta. Para usar LocalDB en vez de Docker hay que:

1. descargar SQL Server Express desde Microsoft;
2. seleccionar expresamente la característica **LocalDB** en su instalador.

Después ejecutar `start.cmd`. El launcher inicia `MSSQLLocalDB`, establece autenticación integrada y deja que EF Core cree `GestorInventarioDB`, aplique la migración y cargue el seed.

Paquetes usados por la instalación asistida:

| Dependencia | Identificador WinGet | Cuándo se instala |
| --- | --- | --- |
| .NET SDK 10 | `Microsoft.DotNet.SDK.10` | Modo nativo con SQL disponible y SDK faltante. |
| Node.js LTS + npm | `OpenJS.NodeJS.LTS` | Modo nativo con SQL disponible y Node faltante. |
| Docker Desktop | `Docker.DockerDesktop` | Modo Docker o Auto sin ruta nativa completa. |

Los comandos aceptan los acuerdos de origen y paquete de WinGet para permitir una instalación no interactiva, pero el launcher informa el paquete antes de ejecutarlo. `-NoInstall` desactiva totalmente ese comportamiento.

Angular 20.3 admite Node.js `^20.19.0`, `^22.12.0` o `^24.0.0`. El launcher rechaza versiones impares/no soportadas —por ejemplo Node 25— y recomienda la edición LTS, evitando fallos posteriores de Angular CLI.

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

En macOS el launcher intenta abrir Docker Desktop y espera hasta dos minutos; en Windows espera hasta tres minutos, contemplando el primer arranque. En Linux se debe iniciar el servicio según la distribución, normalmente:

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

Si la ventana se abrió desde el Explorador o mediante Git Bash y ya se cerró, consultar el último error persistido:

```powershell
Get-Content .\.run\launcher-error.log
```

### PowerShell bloquea scripts

Usar `start.cmd`, que aplica `-ExecutionPolicy Bypass` solo al proceso lanzado. No es necesario cambiar la política permanente del equipo.

### WinGet no está disponible

WinGet forma parte de **Instalador de aplicación** en Windows 10/11. Instalarlo desde [Microsoft](https://aka.ms/getwinget), cerrar la terminal y ejecutar otra vez `start.cmd`. El launcher no descarga ejecutables arbitrarios para reemplazar el gestor de paquetes del sistema.

### WinGet terminó pero el comando sigue sin aparecer

El launcher actualiza el `PATH` de su propio proceso y conoce las rutas habituales de .NET, Node, Docker y LocalDB. Si un instalador exige renovar la sesión, cerrar la ventana y abrir `start.cmd` otra vez. Si Docker o WSL 2 solicitan reinicio, completar ese reinicio antes de repetir el comando.

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

El launcher informa un error accionable si no existe una ruta completa. En Windows intenta instalar de forma visible .NET, Node o Docker Desktop mediante WinGet cuando el modo elegido lo requiere; el usuario puede impedirlo con `-NoInstall`. No descarga instaladores desde ubicaciones arbitrarias, no fuerza LocalDB ni reinicia el equipo. En macOS/Linux no instala software del sistema: mantiene el diagnóstico y remite a los gestores oficiales de cada plataforma.

Referencias de la automatización de Windows:

- [Comando `winget install`](https://learn.microsoft.com/es-es/windows/package-manager/winget/install)
- [Instalar .NET en Windows con WinGet](https://learn.microsoft.com/en-us/dotnet/core/install/windows)
- [Instalar Docker Desktop en Windows](https://docs.docker.com/desktop/setup/install/windows-install/)
- [Instalar SQL Server Express LocalDB](https://learn.microsoft.com/es-es/sql/database-engine/configure-windows/sql-server-express-localdb?view=sql-server-ver17)
