[CmdletBinding()]
param(
    [ValidateSet("Auto", "Docker", "Native")]
    [string]$Mode = "Auto",
    [switch]$Foreground,
    [switch]$NoBuild,
    [switch]$Logs,
    [switch]$Status,
    [switch]$Stop,
    [switch]$Help
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$RunDirectory = Join-Path $ProjectRoot ".run"
$script:DotnetExecutable = $null
$script:NpmExecutable = $null
$script:NativeConnection = $null
$script:NativeMissing = $null
$script:ActiveMode = $null

Set-Location $ProjectRoot

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
  -Logs             Sigue los logs del modo activo.
  -Status           Muestra procesos nativos y contenedores.
  -Stop             Detiene procesos y contenedores sin borrar la base.
  -Help             Muestra esta ayuda.

También puede hacer doble clic en start.cmd para usar el modo Auto.
"@
}

function Throw-SetupError([string]$Message) {
    throw "Error: $Message"
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
    $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
    $npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if ($null -eq $npmCommand) {
        $npmCommand = Get-Command npm -ErrorAction SilentlyContinue
    }

    if ($null -eq $nodeCommand -or $null -eq $npmCommand) {
        return $null
    }

    $majorVersion = [int](& $nodeCommand.Source -p 'Number(process.versions.node.split(".")[0])')
    if ($majorVersion -lt 20) {
        return $null
    }

    return $npmCommand.Source
}

function Resolve-NativeConnection {
    $configuredConnection = Get-EnvironmentValue "NATIVE_DATABASE_CONNECTION"
    if (-not [string]::IsNullOrWhiteSpace($configuredConnection)) {
        return $configuredConnection
    }

    $localDb = Get-Command sqllocaldb.exe -ErrorAction SilentlyContinue
    if ($null -eq $localDb) {
        $localDb = Get-Command sqllocaldb -ErrorAction SilentlyContinue
    }

    if ($null -ne $localDb) {
        & $localDb.Source start MSSQLLocalDB | Out-Null
        $databaseName = Get-EnvironmentValue "DATABASE_NAME" "GestorInventarioDB"
        return "Server=(localdb)\MSSQLLocalDB;Database=$databaseName;Integrated Security=True;TrustServerCertificate=True"
    }

    return $null
}

function Test-NativeRequirements {
    $missing = [System.Collections.Generic.List[string]]::new()
    $script:DotnetExecutable = Get-Dotnet10Executable
    $script:NpmExecutable = Get-CompatibleNpmExecutable
    $script:NativeConnection = Resolve-NativeConnection

    if ($null -eq $script:DotnetExecutable) {
        $missing.Add(".NET SDK 10")
    }
    if ($null -eq $script:NpmExecutable) {
        $missing.Add("Node.js 20+ y npm")
    }
    if ([string]::IsNullOrWhiteSpace($script:NativeConnection)) {
        $missing.Add("SQL Server LocalDB o NATIVE_DATABASE_CONNECTION")
    }

    $script:NativeMissing = $missing -join ", "
    return $missing.Count -eq 0
}

function Require-NativeRequirements {
    if (-not (Test-NativeRequirements)) {
        Throw-SetupError "El modo nativo requiere: $script:NativeMissing. Consulte Doc/08-ejecucion-multiplataforma.md."
    }
}

function Test-DockerEngine {
    if ($null -eq (Get-Command docker -ErrorAction SilentlyContinue)) {
        return $false
    }

    & docker compose version *> $null
    if ($LASTEXITCODE -ne 0) {
        return $false
    }

    & docker info *> $null
    return $LASTEXITCODE -eq 0
}

function Require-Docker {
    if ($null -eq (Get-Command docker -ErrorAction SilentlyContinue)) {
        Throw-SetupError "Docker Desktop no está instalado. Consulte Doc/08-ejecucion-multiplataforma.md."
    }

    & docker compose version *> $null
    if ($LASTEXITCODE -ne 0) {
        Throw-SetupError "El plugin Docker Compose no está disponible."
    }

    & docker info *> $null
    if ($LASTEXITCODE -eq 0) {
        return
    }

    $dockerDesktop = Join-Path $env:ProgramFiles "Docker\Docker\Docker Desktop.exe"
    if (Test-Path $dockerDesktop) {
        Write-Host -NoNewline "Iniciando Docker Desktop"
        Start-Process $dockerDesktop

        for ($attempt = 1; $attempt -le 60; $attempt++) {
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

    Throw-SetupError "Docker está instalado, pero el motor no está disponible. Inicie Docker Desktop."
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
$frontendPort = Get-EnvironmentValue "FRONTEND_PORT" "4200"
$backendPort = Get-EnvironmentValue "BACKEND_PORT" "5100"
$publicHost = Get-EnvironmentValue "PUBLIC_HOST" "localhost"

if (-not $PSBoundParameters.ContainsKey("Mode")) {
    $Mode = Get-EnvironmentValue "RUN_MODE" "Auto"
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
        Start-NativeMode $frontendPort $backendPort $publicHost
    }
    "docker" {
        Start-DockerMode $frontendPort $backendPort $publicHost
    }
    "auto" {
        if (Test-NativeRequirements) {
            Write-Host "Requisitos nativos detectados; se usará ejecución nativa."
            Start-NativeMode $frontendPort $backendPort $publicHost
        } else {
            Write-Host "Modo nativo no disponible ($script:NativeMissing); se usará Docker."
            Start-DockerMode $frontendPort $backendPort $publicHost
        }
    }
    default {
        Throw-SetupError "Modo inválido: $Mode"
    }
}
