[CmdletBinding()]
param(
    [ValidateSet("Auto", "Docker", "Native")]
    [string]$Mode = "Auto",
    [switch]$Foreground,
    [switch]$NoBuild,
    [switch]$Logs,
    [switch]$Status,
    [switch]$Stop,
    [switch]$Check,
    [switch]$NoInstall,
    [switch]$Help
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$RunDirectory = Join-Path $ProjectRoot ".run"
$script:DotnetExecutable = $null
$script:NpmExecutable = $null
$script:NodeVersion = $null
$script:NativeConnection = $null
$script:NativeMissing = $null
$script:ActiveMode = $null
$script:NativeReady = $false
$script:DockerToolingReady = $false
$script:DockerEngineReady = $false

Set-Location $ProjectRoot

if ($env:OS -eq "Windows_NT") {
    try {
        $utf8Encoding = New-Object System.Text.UTF8Encoding($false)
        [Console]::InputEncoding = $utf8Encoding
        [Console]::OutputEncoding = $utf8Encoding
        $OutputEncoding = $utf8Encoding
    } catch {
        # Algunos hosts sin consola no permiten cambiar la codificación.
    }
}

trap {
    $errorRecord = $_
    $errorMessage = $errorRecord.Exception.Message

    try {
        New-Item -ItemType Directory -Force -Path $RunDirectory | Out-Null
        $errorLogPath = Join-Path $RunDirectory "launcher-error.log"
        @(
            "Fecha: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss K')"
            "Modo solicitado: $Mode"
            "Mensaje: $errorMessage"
            ""
            "Detalle:"
            ($errorRecord | Out-String)
        ) | Set-Content -Encoding UTF8 $errorLogPath
        Write-Host "Detalle persistente: $errorLogPath" -ForegroundColor Yellow
    } catch {
        Write-Host "No fue posible escribir .run\launcher-error.log." -ForegroundColor Yellow
    }

    Write-Host $errorMessage -ForegroundColor Red
    exit 1
}

function Show-Usage {
    @"
Uso: .\start.ps1 [opciones]

Inicio:
  -Mode Auto        Prefiere ejecución nativa y usa Docker como fallback.
  -Mode Docker      Ejecuta todo con Docker Compose.
  -Mode Native      Ejecuta API y frontend en Windows; usa LocalDB o la conexión configurada.
  -Foreground       Mantiene los logs en primer plano.
  -NoBuild          Reutiliza las imágenes Docker existentes.

Administración:
  -Check            Diagnostica requisitos y sale sin instalar ni iniciar servicios.
  -NoInstall        No instala software; solo usa lo que ya existe en el equipo.
  -Logs             Sigue los logs del modo activo.
  -Status           Muestra procesos nativos y contenedores.
  -Stop             Detiene procesos y contenedores sin borrar la base.
  -Help             Muestra esta ayuda.

También puede hacer doble clic en start.cmd para usar el modo Auto.
En Windows, el inicio normal usa WinGet para instalar requisitos faltantes cuando es posible.
"@
}

function Throw-SetupError([string]$Message) {
    throw "Error: $Message"
}

function Test-IsWindows {
    return $env:OS -eq "Windows_NT"
}

function Refresh-ProcessPath {
    if (-not (Test-IsWindows)) {
        return
    }

    $machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
    $pathParts = [System.Collections.Generic.List[string]]::new()

    foreach ($pathValue in @($machinePath, $userPath, $env:Path)) {
        if ([string]::IsNullOrWhiteSpace($pathValue)) {
            continue
        }

        foreach ($pathPart in ($pathValue -split ";")) {
            if ([string]::IsNullOrWhiteSpace($pathPart)) {
                continue
            }

            if (-not $pathParts.Contains($pathPart)) {
                $pathParts.Add($pathPart)
            }
        }
    }

    if (-not [string]::IsNullOrWhiteSpace($env:ProgramFiles)) {
        $knownPaths = @(
            (Join-Path $env:ProgramFiles "dotnet"),
            (Join-Path $env:ProgramFiles "nodejs"),
            (Join-Path $env:ProgramFiles "Docker\Docker\resources\bin"),
            (Join-Path $env:ProgramFiles "Microsoft SQL Server\170\Tools\Binn"),
            (Join-Path $env:ProgramFiles "Microsoft SQL Server\160\Tools\Binn"),
            (Join-Path $env:ProgramFiles "Microsoft SQL Server\150\Tools\Binn"),
            (Join-Path $env:ProgramFiles "Microsoft SQL Server\140\Tools\Binn")
        )

        foreach ($knownPath in $knownPaths) {
            if ((Test-Path $knownPath) -and -not $pathParts.Contains($knownPath)) {
                $pathParts.Add($knownPath)
            }
        }
    }

    $env:Path = $pathParts -join ";"
}

function Get-WinGetExecutable {
    if (-not (Test-IsWindows)) {
        return $null
    }

    $wingetCommand = Get-Command winget.exe -ErrorAction SilentlyContinue
    if ($null -eq $wingetCommand) {
        $wingetCommand = Get-Command winget -ErrorAction SilentlyContinue
    }

    if ($null -eq $wingetCommand) {
        return $null
    }

    return $wingetCommand.Source
}

function Install-WinGetPackage([string]$PackageId, [string]$Label) {
    if ($NoInstall) {
        Throw-SetupError "Falta $Label y se deshabilitó la instalación automática con -NoInstall."
    }

    $wingetExecutable = Get-WinGetExecutable
    if ($null -eq $wingetExecutable) {
        Throw-SetupError "Falta $Label y WinGet no está disponible. Instale 'Instalador de aplicación' desde Microsoft Store (https://aka.ms/getwinget), cierre y abra la terminal y vuelva a ejecutar start.cmd."
    }

    Write-Host "`nFalta $Label." -ForegroundColor Yellow
    Write-Host "Se instalará '$PackageId' con WinGet. El instalador puede solicitar permisos de administrador."

    & $wingetExecutable install `
        --id $PackageId `
        --exact `
        --source winget `
        --silent `
        --disable-interactivity `
        --accept-source-agreements `
        --accept-package-agreements

    $installExitCode = $LASTEXITCODE
    if ($installExitCode -ne 0) {
        Throw-SetupError "WinGet no pudo instalar $Label (código $installExitCode). Revise el mensaje anterior, acepte la solicitud de administrador si aparece y repita start.cmd."
    }

    Refresh-ProcessPath
    Write-Host "$Label quedó instalado según WinGet. Se verificarán nuevamente los requisitos."
}

function Ensure-EnvironmentFile {
    $examplePath = Join-Path $ProjectRoot ".env.example"
    $environmentPath = Join-Path $ProjectRoot ".env"

    if (-not (Test-Path $examplePath)) {
        Throw-SetupError "No se encontró .env.example en la raíz del proyecto."
    }

    if (-not (Test-Path $environmentPath)) {
        Copy-Item $examplePath $environmentPath
        Write-Host "Se creó .env a partir de .env.example."
    }
}

function Get-EnvironmentValue([string]$Key, [string]$Fallback = "") {
    $processValue = [Environment]::GetEnvironmentVariable($Key, "Process")
    if (-not [string]::IsNullOrWhiteSpace($processValue)) {
        return $processValue
    }

    $environmentPath = Join-Path $ProjectRoot ".env"
    if (Test-Path $environmentPath) {
        foreach ($line in Get-Content $environmentPath) {
            $trimmedLine = $line.Trim()
            if ($trimmedLine.StartsWith("#") -or -not $trimmedLine.Contains("=")) {
                continue
            }

            $separator = $trimmedLine.IndexOf("=")
            if ($trimmedLine.Substring(0, $separator) -eq $Key) {
                $value = $trimmedLine.Substring($separator + 1)
                if (-not [string]::IsNullOrWhiteSpace($value)) {
                    return $value
                }
            }
        }
    }

    return $Fallback
}

function Get-Dotnet10Executable {
    $candidates = [System.Collections.Generic.List[string]]::new()
    $userDotnet = Join-Path $HOME ".dotnet\dotnet.exe"
    if (Test-Path $userDotnet) {
        $candidates.Add($userDotnet)
    }

    $dotnetCommand = Get-Command dotnet -ErrorAction SilentlyContinue
    if ($null -ne $dotnetCommand -and -not $candidates.Contains($dotnetCommand.Source)) {
        $candidates.Add($dotnetCommand.Source)
    }

    foreach ($candidate in $candidates) {
        $sdks = & $candidate --list-sdks 2>$null
        if ($sdks -match '^10\.') {
            return $candidate
        }
    }

    return $null
}

function Get-CompatibleNpmExecutable {
    $script:NodeVersion = $null
    $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
    $npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if ($null -eq $npmCommand) {
        $npmCommand = Get-Command npm -ErrorAction SilentlyContinue
    }

    if ($null -eq $nodeCommand) {
        return $null
    }

    if ($null -eq $npmCommand) {
        $npmNextToNode = Join-Path (Split-Path -Parent $nodeCommand.Source) "npm.cmd"
        if (Test-Path $npmNextToNode) {
            $npmCommand = Get-Item $npmNextToNode
        }
    }

    $versionText = [string](& $nodeCommand.Source --version 2>$null | Select-Object -First 1)
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($versionText)) {
        return $null
    }

    $normalizedVersion = $versionText.Trim().TrimStart([char]"v")
    $parsedVersion = $null
    if (-not [version]::TryParse($normalizedVersion, [ref]$parsedVersion)) {
        return $null
    }

    $script:NodeVersion = $parsedVersion.ToString()
    $isSupportedVersion =
        (($parsedVersion.Major -eq 20) -and ($parsedVersion -ge [version]"20.19.0")) -or
        (($parsedVersion.Major -eq 22) -and ($parsedVersion -ge [version]"22.12.0")) -or
        ($parsedVersion.Major -eq 24)

    if (-not $isSupportedVersion -or $null -eq $npmCommand) {
        return $null
    }

    return $npmCommand.Source
}

function Resolve-NativeConnection([switch]$DoNotStartLocalDb) {
    $configuredConnection = Get-EnvironmentValue "NATIVE_DATABASE_CONNECTION"
    if (-not [string]::IsNullOrWhiteSpace($configuredConnection)) {
        return $configuredConnection
    }

    $localDb = Get-Command sqllocaldb.exe -ErrorAction SilentlyContinue
    if ($null -eq $localDb) {
        $localDb = Get-Command sqllocaldb -ErrorAction SilentlyContinue
    }

    if ($null -ne $localDb) {
        if (-not $DoNotStartLocalDb) {
            & $localDb.Source start MSSQLLocalDB *> $null
            if ($LASTEXITCODE -ne 0) {
                & $localDb.Source create MSSQLLocalDB -s *> $null
            }

            if ($LASTEXITCODE -ne 0) {
                return $null
            }
        }

        $databaseName = Get-EnvironmentValue "DATABASE_NAME" "GestorInventarioDB"
        return "Server=(localdb)\MSSQLLocalDB;Database=$databaseName;Integrated Security=True;TrustServerCertificate=True"
    }

    return $null
}

function Test-NativeRequirements([switch]$DoNotStartServices) {
    $missing = [System.Collections.Generic.List[string]]::new()
    $script:DotnetExecutable = Get-Dotnet10Executable
    $script:NpmExecutable = Get-CompatibleNpmExecutable
    $script:NativeConnection = Resolve-NativeConnection -DoNotStartLocalDb:$DoNotStartServices

    if ($null -eq $script:DotnetExecutable) {
        $missing.Add(".NET SDK 10")
    }
    if ($null -eq $script:NpmExecutable) {
        if ($null -ne $script:NodeVersion) {
            $missing.Add("Node.js compatible con Angular 20 (detectado $script:NodeVersion; use 20.19+, 22.12+ o 24.x) y npm")
        } else {
            $missing.Add("Node.js compatible con Angular 20 (20.19+, 22.12+ o 24.x) y npm")
        }
    }
    if ([string]::IsNullOrWhiteSpace($script:NativeConnection)) {
        $missing.Add("SQL Server LocalDB o NATIVE_DATABASE_CONNECTION")
    }

    $script:NativeMissing = $missing -join ", "
    $script:NativeReady = $missing.Count -eq 0
    return $script:NativeReady
}

function Require-NativeRequirements {
    if (
        $script:NativeReady -and
        $null -ne $script:DotnetExecutable -and
        $null -ne $script:NpmExecutable -and
        -not [string]::IsNullOrWhiteSpace($script:NativeConnection)
    ) {
        return
    }

    if (-not (Test-NativeRequirements)) {
        $databaseHelp = ""
        if ([string]::IsNullOrWhiteSpace($script:NativeConnection)) {
            $databaseHelp = " LocalDB debe instalarse seleccionando esa característica en SQL Server Express (https://aka.ms/sqlexpress) o puede definir NATIVE_DATABASE_CONNECTION en .env."
        }

        Throw-SetupError "El modo nativo aún requiere: $script:NativeMissing.$databaseHelp Consulte Doc/08-ejecucion-multiplataforma.md."
    }
}

function Test-DockerTooling {
    if ($null -eq (Get-Command docker -ErrorAction SilentlyContinue)) {
        $script:DockerToolingReady = $false
        return $false
    }

    & docker compose version *> $null
    if ($LASTEXITCODE -ne 0) {
        $script:DockerToolingReady = $false
        return $false
    }

    $script:DockerToolingReady = $true
    return $true
}

function Test-DockerEngine {
    if (-not (Test-DockerTooling)) {
        $script:DockerEngineReady = $false
        return $false
    }

    & docker info *> $null
    $script:DockerEngineReady = $LASTEXITCODE -eq 0
    return $script:DockerEngineReady
}

function Show-RequirementReport([switch]$DoNotStartServices) {
    $nativeReady = Test-NativeRequirements -DoNotStartServices:$DoNotStartServices
    $dockerToolingReady = Test-DockerTooling
    $dockerEngineReady = $false
    if ($dockerToolingReady) {
        $dockerEngineReady = Test-DockerEngine
    }

    $rows = @(
        [PSCustomObject]@{
            Requisito = ".NET SDK 10"
            Estado = $(if ($null -ne $script:DotnetExecutable) { "LISTO" } else { "FALTA" })
            Uso = "Modo nativo"
        },
        [PSCustomObject]@{
            Requisito = "Node.js compatible + npm"
            Estado = $(if ($null -ne $script:NpmExecutable) { "LISTO ($script:NodeVersion)" } elseif ($null -ne $script:NodeVersion) { "NO SOPORTADO ($script:NodeVersion)" } else { "FALTA" })
            Uso = "Modo nativo"
        },
        [PSCustomObject]@{
            Requisito = "SQL Server / LocalDB"
            Estado = $(if (-not [string]::IsNullOrWhiteSpace($script:NativeConnection)) { "LISTO" } else { "FALTA" })
            Uso = "Modo nativo"
        },
        [PSCustomObject]@{
            Requisito = "Docker + Compose"
            Estado = $(if ($dockerToolingReady) { "LISTO" } else { "FALTA" })
            Uso = "Modo Docker"
        },
        [PSCustomObject]@{
            Requisito = "Motor Docker"
            Estado = $(if ($dockerEngineReady) { "ACTIVO" } elseif ($dockerToolingReady) { "DETENIDO" } else { "NO APLICA" })
            Uso = "Modo Docker"
        },
        [PSCustomObject]@{
            Requisito = "WinGet"
            Estado = $(if ($null -ne (Get-WinGetExecutable)) { "LISTO" } elseif (Test-IsWindows) { "FALTA" } else { "NO APLICA" })
            Uso = "Instalación asistida"
        }
    )

    Write-Host "`nDiagnóstico de requisitos"
    $rows | Format-Table -AutoSize | Out-String | Write-Host

    if ($nativeReady) {
        Write-Host "Ruta nativa: lista. No se necesita Docker."
    } elseif ($dockerToolingReady) {
        Write-Host "Ruta Docker: instalada$(if ($dockerEngineReady) { ' y activa' } else { '; falta iniciar Docker Desktop' })."
    } elseif (Test-IsWindows) {
        if ($NoInstall) {
            Write-Host "No hay una ruta completa y -NoInstall impide instalar requisitos." -ForegroundColor Yellow
        } else {
            switch ($Mode.ToLowerInvariant()) {
                "native" {
                    Write-Host "Modo Native: se intentará instalar .NET y Node.js con WinGet; LocalDB o NATIVE_DATABASE_CONNECTION deben definirse explícitamente." -ForegroundColor Yellow
                }
                "docker" {
                    Write-Host "Modo Docker: se intentará instalar Docker Desktop con WinGet." -ForegroundColor Yellow
                }
                default {
                    if (-not [string]::IsNullOrWhiteSpace($script:NativeConnection)) {
                        Write-Host "Modo Auto: existe SQL; se intentará completar .NET y Node.js con WinGet." -ForegroundColor Yellow
                    } else {
                        Write-Host "Modo Auto: se intentará instalar Docker Desktop con WinGet." -ForegroundColor Yellow
                    }
                }
            }
        }
    }

    return [PSCustomObject]@{
        NativeReady = $nativeReady
        DockerToolingReady = $dockerToolingReady
        DockerEngineReady = $dockerEngineReady
    }
}

function Install-NativeToolchain {
    Test-NativeRequirements | Out-Null

    if ($null -eq $script:DotnetExecutable) {
        Install-WinGetPackage "Microsoft.DotNet.SDK.10" ".NET SDK 10"
    }

    if ($null -eq $script:NpmExecutable) {
        Install-WinGetPackage "OpenJS.NodeJS.LTS" "Node.js LTS y npm"
    }

    Refresh-ProcessPath
    Test-NativeRequirements | Out-Null
}

function Install-DockerDesktop {
    Install-WinGetPackage "Docker.DockerDesktop" "Docker Desktop"
    Refresh-ProcessPath

    if (-not (Test-DockerTooling)) {
        Throw-SetupError "Docker Desktop fue instalado, pero esta terminal aún no encuentra 'docker compose'. Cierre esta ventana, abra start.cmd de nuevo y, si Windows lo solicita, reinicie el equipo."
    }
}

function Require-Docker {
    if (-not (Test-DockerTooling)) {
        Throw-SetupError "Docker Desktop o el plugin Compose no están disponibles. Ejecute start.cmd para instalarlos automáticamente o consulte Doc/08-ejecucion-multiplataforma.md."
    }

    & docker info *> $null
    if ($LASTEXITCODE -eq 0) {
        return
    }

    $dockerDesktop = $null
    if (-not [string]::IsNullOrWhiteSpace($env:ProgramFiles)) {
        $dockerDesktopCandidate = Join-Path $env:ProgramFiles "Docker\Docker\Docker Desktop.exe"
        if (Test-Path $dockerDesktopCandidate) {
            $dockerDesktop = $dockerDesktopCandidate
        }
    }

    if ($null -ne $dockerDesktop) {
        Write-Host -NoNewline "Iniciando Docker Desktop"
        Start-Process $dockerDesktop | Out-Null

        for ($attempt = 1; $attempt -le 90; $attempt++) {
            Start-Sleep -Seconds 2
            & docker info *> $null
            if ($LASTEXITCODE -eq 0) {
                Write-Host " listo."
                return
            }
            Write-Host -NoNewline "."
        }
        Write-Host
    }

    Throw-SetupError "Docker está instalado, pero el motor no quedó disponible. Abra Docker Desktop, complete la configuración inicial/WSL 2 que Windows solicite y vuelva a ejecutar start.cmd."
}

function Test-PidFile([string]$PidFile) {
    if (-not (Test-Path $PidFile)) {
        return $false
    }

    $processId = Get-Content $PidFile -First 1
    if ([string]::IsNullOrWhiteSpace($processId)) {
        return $false
    }

    return $null -ne (Get-Process -Id ([int]$processId) -ErrorAction SilentlyContinue)
}

function Stop-PidFile([string]$PidFile, [string]$Label) {
    if (Test-PidFile $PidFile) {
        $processId = [int](Get-Content $PidFile -First 1)
        Stop-Process -Id $processId -ErrorAction SilentlyContinue
        Write-Host "$Label detenido."
    }

    Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
}

function Stop-NativeProcesses {
    Stop-PidFile (Join-Path $RunDirectory "frontend.pid") "Frontend nativo"
    Stop-PidFile (Join-Path $RunDirectory "backend.pid") "Backend nativo"
}

function Show-NativeStatus {
    $backendPid = Join-Path $RunDirectory "backend.pid"
    $frontendPid = Join-Path $RunDirectory "frontend.pid"

    if (Test-PidFile $backendPid) {
        Write-Host "Backend nativo:  activo (PID $(Get-Content $backendPid -First 1))"
    } else {
        Write-Host "Backend nativo:  detenido"
    }

    if (Test-PidFile $frontendPid) {
        Write-Host "Frontend nativo: activo (PID $(Get-Content $frontendPid -First 1))"
    } else {
        Write-Host "Frontend nativo: detenido"
    }
}

function Show-Diagnostics {
    if ($script:ActiveMode -eq "Docker") {
        & docker compose ps
        & docker compose logs --tail=80
        return
    }

    foreach ($logName in @("backend.out.log", "backend.err.log", "frontend.out.log", "frontend.err.log")) {
        $logPath = Join-Path $RunDirectory $logName
        if (Test-Path $logPath) {
            Write-Host "`n$logName"
            Get-Content $logPath -Tail 80
        }
    }
}

function Wait-ForUrl([string]$Url, [string]$ServiceName, [int]$MaxAttempts) {
    Write-Host -NoNewline "Esperando $ServiceName"

    for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
        try {
            Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3 | Out-Null
            Write-Host " listo."
            return $true
        } catch {
            Write-Host -NoNewline "."
            Start-Sleep -Seconds 2
        }
    }

    Write-Host "`nTiempo de espera agotado para $ServiceName." -ForegroundColor Red
    Show-Diagnostics
    return $false
}

function Show-Urls([string]$PublicHost, [string]$FrontendPort, [string]$BackendPort) {
    Write-Host "`nAGAVAL está disponible en:"
    Write-Host "  Frontend: http://${PublicHost}:$FrontendPort"
    Write-Host "  API:      http://${PublicHost}:$BackendPort"
}

function Start-DockerMode([string]$FrontendPort, [string]$BackendPort, [string]$PublicHost) {
    $script:ActiveMode = "Docker"
    Require-Docker

    & docker compose config --quiet
    if ($LASTEXITCODE -ne 0) {
        Throw-SetupError "docker-compose.yml o .env no son válidos."
    }

    $arguments = @("compose", "up")
    if (-not $Foreground) {
        $arguments += "--detach"
    }
    if (-not $NoBuild) {
        $arguments += "--build"
    }

    & docker @arguments
    if ($LASTEXITCODE -ne 0) {
        Throw-SetupError "Docker Compose no pudo iniciar el proyecto."
    }

    if (-not $Foreground) {
        if (-not (Wait-ForUrl "http://localhost:$BackendPort/health" "la API" 90)) {
            Throw-SetupError "La API no respondió."
        }
        if (-not (Wait-ForUrl "http://localhost:$FrontendPort" "el frontend" 30)) {
            Throw-SetupError "El frontend no respondió."
        }

        & docker compose ps
        Show-Urls $PublicHost $FrontendPort $BackendPort
        Write-Host "`nModo seleccionado: Docker. Use .\start.ps1 -Logs o .\start.ps1 -Stop."
    }
}

function Set-ChildEnvironment([hashtable]$Values) {
    $previousValues = @{}
    foreach ($entry in $Values.GetEnumerator()) {
        $previousValues[$entry.Key] = [Environment]::GetEnvironmentVariable($entry.Key, "Process")
        [Environment]::SetEnvironmentVariable($entry.Key, $entry.Value, "Process")
    }
    return $previousValues
}

function Restore-ChildEnvironment([hashtable]$Values) {
    foreach ($entry in $Values.GetEnumerator()) {
        [Environment]::SetEnvironmentVariable($entry.Key, $entry.Value, "Process")
    }
}

function Start-NativeMode([string]$FrontendPort, [string]$BackendPort, [string]$PublicHost) {
    $script:ActiveMode = "Native"
    Require-NativeRequirements
    New-Item -ItemType Directory -Force -Path $RunDirectory | Out-Null

    $backendPidFile = Join-Path $RunDirectory "backend.pid"
    $frontendPidFile = Join-Path $RunDirectory "frontend.pid"
    if ((Test-PidFile $backendPidFile) -or (Test-PidFile $frontendPidFile)) {
        Throw-SetupError "Ya existe una ejecución nativa. Use .\start.ps1 -Status o -Stop."
    }

    Write-Host "Restaurando backend .NET..."
    & $script:DotnetExecutable restore (Join-Path $ProjectRoot "backend\Agaval.Inventory.slnx")
    if ($LASTEXITCODE -ne 0) {
        Throw-SetupError "Falló dotnet restore."
    }

    $packageLock = Join-Path $ProjectRoot "frontend\package-lock.json"
    $installedLock = Join-Path $ProjectRoot "frontend\node_modules\.package-lock.json"
    $requiresNpmInstall = -not (Test-Path -LiteralPath $installedLock -PathType Leaf)
    if (-not $requiresNpmInstall) {
        $requiresNpmInstall =
            (Get-Item -LiteralPath $packageLock).LastWriteTimeUtc -gt
            (Get-Item -LiteralPath $installedLock -Force).LastWriteTimeUtc
    }

    if ($requiresNpmInstall) {
        Write-Host "Instalando dependencias del frontend..."
        Push-Location (Join-Path $ProjectRoot "frontend")
        try {
            & $script:NpmExecutable ci
            if ($LASTEXITCODE -ne 0) {
                Throw-SetupError "Falló npm ci."
            }
        } finally {
            Pop-Location
        }
    }

    $proxyPath = Join-Path $RunDirectory "proxy.native.json"
    @{
        "/api" = @{
            target = "http://localhost:$BackendPort"
            secure = $false
            changeOrigin = $true
        }
    } | ConvertTo-Json -Depth 3 | Set-Content -Encoding UTF8 $proxyPath

    $environmentValues = @{
        "ASPNETCORE_ENVIRONMENT" = "Development"
        "ASPNETCORE_URLS" = "http://0.0.0.0:$BackendPort"
        "ConnectionStrings__Database" = $script:NativeConnection
        "Database__ApplyMigrationsOnStartup" = "true"
        "Cors__AllowedOrigins__0" = "http://localhost:$FrontendPort"
    }
    $previousEnvironment = Set-ChildEnvironment $environmentValues

    try {
        $backendStart = @{
            FilePath = $script:DotnetExecutable
            ArgumentList = @("run", "--project", "src/Agaval.Inventory.Api/Agaval.Inventory.Api.csproj", "--no-launch-profile", "--no-restore")
            WorkingDirectory = Join-Path $ProjectRoot "backend"
            RedirectStandardOutput = Join-Path $RunDirectory "backend.out.log"
            RedirectStandardError = Join-Path $RunDirectory "backend.err.log"
            PassThru = $true
        }
        $backendProcess = Start-Process @backendStart
    } finally {
        Restore-ChildEnvironment $previousEnvironment
    }
    Set-Content -Path $backendPidFile -Value $backendProcess.Id

    $quotedProxyPath = '"' + $proxyPath + '"'
    $frontendStart = @{
        FilePath = $script:NpmExecutable
        ArgumentList = @("start", "--", "--host", "0.0.0.0", "--port", $FrontendPort, "--proxy-config", $quotedProxyPath)
        WorkingDirectory = Join-Path $ProjectRoot "frontend"
        RedirectStandardOutput = Join-Path $RunDirectory "frontend.out.log"
        RedirectStandardError = Join-Path $RunDirectory "frontend.err.log"
        PassThru = $true
    }
    $frontendProcess = Start-Process @frontendStart
    Set-Content -Path $frontendPidFile -Value $frontendProcess.Id

    if (-not (Wait-ForUrl "http://localhost:$BackendPort/health" "la API nativa" 90)) {
        Stop-NativeProcesses
        Throw-SetupError "La API nativa no respondió."
    }
    if (-not (Wait-ForUrl "http://localhost:$FrontendPort" "el frontend nativo" 45)) {
        Stop-NativeProcesses
        Throw-SetupError "El frontend nativo no respondió."
    }

    Show-NativeStatus
    Show-Urls $PublicHost $FrontendPort $BackendPort
    Write-Host "`nModo seleccionado: nativo. Logs en .run\."

    if ($Foreground) {
        try {
            $logPaths = @(
                (Join-Path $RunDirectory "backend.out.log"),
                (Join-Path $RunDirectory "backend.err.log"),
                (Join-Path $RunDirectory "frontend.out.log"),
                (Join-Path $RunDirectory "frontend.err.log")
            )
            Get-Content -Path $logPaths -Wait
        } finally {
            Stop-NativeProcesses
        }
    }
}

if ($Help) {
    Show-Usage
    exit 0
}

Ensure-EnvironmentFile
Refresh-ProcessPath
$frontendPort = Get-EnvironmentValue "FRONTEND_PORT" "4200"
$backendPort = Get-EnvironmentValue "BACKEND_PORT" "5100"
$publicHost = Get-EnvironmentValue "PUBLIC_HOST" "localhost"

if (-not $PSBoundParameters.ContainsKey("Mode")) {
    $Mode = Get-EnvironmentValue "RUN_MODE" "Auto"
}

if ($Check) {
    $requirements = Show-RequirementReport -DoNotStartServices
    Write-Host "`nDiagnóstico terminado. No se instaló software ni se iniciaron servicios."
    exit 0
}

if ($Logs) {
    $backendPidFile = Join-Path $RunDirectory "backend.pid"
    $frontendPidFile = Join-Path $RunDirectory "frontend.pid"
    if ((Test-PidFile $backendPidFile) -or (Test-PidFile $frontendPidFile)) {
        $logPaths = @(
            (Join-Path $RunDirectory "backend.out.log"),
            (Join-Path $RunDirectory "backend.err.log"),
            (Join-Path $RunDirectory "frontend.out.log"),
            (Join-Path $RunDirectory "frontend.err.log")
        )
        Get-Content -Path $logPaths -Wait
    } else {
        Require-Docker
        & docker compose logs --follow --tail=100
    }
    exit $LASTEXITCODE
}

if ($Status) {
    Show-NativeStatus
    if (Test-DockerEngine) {
        & docker compose ps
    } else {
        Write-Host "Docker:           no disponible o detenido"
    }
    exit 0
}

if ($Stop) {
    Stop-NativeProcesses
    if (Test-DockerEngine) {
        & docker compose down
        Write-Host "Contenedores detenidos. El volumen SQL Server se conservó."
    }
    exit 0
}

switch ($Mode.ToLowerInvariant()) {
    "native" {
        $requirements = Show-RequirementReport
        if (-not $requirements.NativeReady -and -not $NoInstall -and (Test-IsWindows)) {
            Install-NativeToolchain
        }
        Start-NativeMode $frontendPort $backendPort $publicHost
    }
    "docker" {
        $requirements = Show-RequirementReport
        if (-not $requirements.DockerToolingReady) {
            if ($NoInstall -or -not (Test-IsWindows)) {
                Require-Docker
            }
            Install-DockerDesktop
        }
        Start-DockerMode $frontendPort $backendPort $publicHost
    }
    "auto" {
        $requirements = Show-RequirementReport
        if ($requirements.NativeReady) {
            Write-Host "Requisitos nativos detectados; se usará ejecución nativa."
            Start-NativeMode $frontendPort $backendPort $publicHost
        } elseif ($requirements.DockerToolingReady) {
            Write-Host "La ruta nativa no está completa ($script:NativeMissing); se usará Docker."
            Start-DockerMode $frontendPort $backendPort $publicHost
        } elseif ($NoInstall -or -not (Test-IsWindows)) {
            Throw-SetupError "No existe una ruta completa. Modo nativo: $script:NativeMissing. Docker Desktop + Compose tampoco están disponibles. Consulte Doc/08-ejecucion-multiplataforma.md."
        } else {
            if (-not [string]::IsNullOrWhiteSpace($script:NativeConnection)) {
                Write-Host "Existe SQL Server para el modo nativo; se intentará completar .NET y Node.js."
                Install-NativeToolchain
            }

            if (Test-NativeRequirements) {
                Write-Host "Requisitos nativos completados; no se necesita Docker."
                Start-NativeMode $frontendPort $backendPort $publicHost
                break
            }

            Write-Host "La ruta nativa aún requiere $script:NativeMissing; se preparará el entorno reproducible con Docker."
            Install-DockerDesktop
            Start-DockerMode $frontendPort $backendPort $publicHost
        }
    }
    default {
        Throw-SetupError "Modo inválido: $Mode"
    }
}
