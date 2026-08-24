$ErrorActionPreference = "Stop"
$BackendDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$DotnetCommand = Get-Command dotnet -ErrorAction SilentlyContinue

if ($null -eq $DotnetCommand) {
    Write-Error ".NET SDK 10 no está instalado o dotnet no está disponible en PATH."
    exit 1
}

$InstalledSdks = & $DotnetCommand.Source --list-sdks
if ($LASTEXITCODE -ne 0 -or -not ($InstalledSdks -match '^10\.')) {
    Write-Error "AGAVAL requiere .NET SDK 10."
    exit 1
}

Push-Location $BackendDirectory
try {
    & $DotnetCommand.Source run `
        --project "src/Agaval.Inventory.Api/Agaval.Inventory.Api.csproj" `
        --launch-profile http `
        @args
    $RunExitCode = $LASTEXITCODE
} finally {
    Pop-Location
}

exit $RunExitCode
