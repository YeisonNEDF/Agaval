#!/bin/sh

set -eu

BACKEND_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

if ! command -v dotnet >/dev/null 2>&1; then
  printf 'Error: .NET SDK 10 no está instalado o dotnet no está disponible en PATH.\n' >&2
  exit 1
fi

if ! dotnet --list-sdks 2>/dev/null | grep -q '^10\.'; then
  printf 'Error: AGAVAL requiere .NET SDK 10.\n' >&2
  exit 1
fi

cd "$BACKEND_DIR"
exec dotnet run \
  --project src/Agaval.Inventory.Api/Agaval.Inventory.Api.csproj \
  --launch-profile http \
  "$@"
