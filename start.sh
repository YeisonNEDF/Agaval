#!/bin/sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$SCRIPT_DIR"

RUN_DIR="$SCRIPT_DIR/.run"
ACTION="start"
MODE="auto"
MODE_FROM_CLI="false"
DETACHED="true"
BUILD="true"
NO_INSTALL="false"
DOTNET_EXEC=""
NPM_EXEC=""
NATIVE_CONNECTION=""
ACTIVE_MODE=""

usage() {
  cat <<'EOF'
Uso: ./start.sh [opciones]

Inicio:
  --mode auto       Prefiere ejecución nativa cuando todos los requisitos existen (predeterminado).
  --mode docker     Ejecuta SQL Server, API y frontend con Docker Compose.
  --mode native     Ejecuta API y frontend en el host y usa un SQL Server configurado.
  --foreground      Mantiene los logs en primer plano.
  --no-build        Reutiliza las imágenes Docker existentes.

Administración:
  --check           Diagnostica requisitos y sale sin instalar ni iniciar servicios.
  --no-install      En Windows, impide que PowerShell instale requisitos con WinGet.
  --logs            Sigue los logs del modo activo.
  --status          Muestra procesos nativos y contenedores.
  --stop            Detiene procesos y contenedores sin borrar la base.
  -h, --help        Muestra esta ayuda.

En Windows, este script delega en start.ps1. También puede usar start.cmd.
EOF
}

fail() {
  printf 'Error: %s\n' "$1" >&2
  exit 1
}

detect_platform() {
  kernel_name=$(uname -s)

  case "$kernel_name" in
    Darwin)
      PLATFORM="macos"
      ;;
    Linux)
      if [ -r /proc/version ] && grep -qi microsoft /proc/version; then
        PLATFORM="wsl"
      else
        PLATFORM="linux"
      fi
      ;;
    MINGW*|MSYS*|CYGWIN*)
      PLATFORM="windows-shell"
      ;;
    *)
      fail "Sistema operativo no soportado: $kernel_name"
      ;;
  esac
}

ensure_environment() {
  [ -f ".env.example" ] || fail "No se encontró .env.example en la raíz del proyecto."

  if [ ! -f ".env" ]; then
    cp ".env.example" ".env"
    chmod 600 ".env"
    printf 'Se creó .env a partir de .env.example.\n'
  fi
}

read_env() {
  requested_key="$1"
  fallback_value="$2"
  resolved_value=$(awk -F= -v key="$requested_key" '$1 == key { sub(/^[^=]*=/, ""); print; exit }' .env)

  if [ -z "$resolved_value" ]; then
    resolved_value="$fallback_value"
  fi

  printf '%s' "$resolved_value"
}

find_dotnet_10() {
  if [ -x "$HOME/.dotnet/dotnet" ] && "$HOME/.dotnet/dotnet" --list-sdks 2>/dev/null | grep -q '^10\.'; then
    DOTNET_EXEC="$HOME/.dotnet/dotnet"
    return 0
  fi

  if command -v dotnet >/dev/null 2>&1 && dotnet --list-sdks 2>/dev/null | grep -q '^10\.'; then
    DOTNET_EXEC=$(command -v dotnet)
    return 0
  fi

  return 1
}

find_compatible_node() {
  command -v node >/dev/null 2>&1 || return 1
  command -v npm >/dev/null 2>&1 || return 1

  node_version=$(node --version 2>/dev/null || printf '')
  node_version=${node_version#v}
  node_major=${node_version%%.*}
  node_remainder=${node_version#*.}
  node_minor=${node_remainder%%.*}

  case "$node_major:$node_minor" in
    20:*) [ "$node_minor" -ge 19 ] 2>/dev/null || return 1 ;;
    22:*) [ "$node_minor" -ge 12 ] 2>/dev/null || return 1 ;;
    24:*) ;;
    *) return 1 ;;
  esac

  NPM_EXEC=$(command -v npm)
}

resolve_native_connection() {
  NATIVE_CONNECTION=${NATIVE_DATABASE_CONNECTION:-$(read_env "NATIVE_DATABASE_CONNECTION" "")}
  [ -n "$NATIVE_CONNECTION" ]
}

native_is_ready() {
  native_missing=""

  if ! find_dotnet_10; then
    native_missing=".NET SDK 10"
  fi

  if ! find_compatible_node; then
    if [ -n "$native_missing" ]; then
      native_missing="$native_missing, Node.js compatible con Angular 20 (20.19+, 22.12+ o 24.x) y npm"
    else
      native_missing="Node.js compatible con Angular 20 (20.19+, 22.12+ o 24.x) y npm"
    fi
  fi

  if ! resolve_native_connection; then
    if [ -n "$native_missing" ]; then
      native_missing="$native_missing, NATIVE_DATABASE_CONNECTION"
    else
      native_missing="NATIVE_DATABASE_CONNECTION"
    fi
  fi

  [ -z "$native_missing" ]
}

require_native() {
  if ! native_is_ready; then
    fail "El modo nativo requiere: $native_missing. Consulte Doc/08-ejecucion-multiplataforma.md."
  fi
}

docker_engine_is_ready() {
  docker_tooling_is_ready || return 1
  docker info >/dev/null 2>&1
}

docker_tooling_is_ready() {
  command -v docker >/dev/null 2>&1 || return 1
  docker compose version >/dev/null 2>&1
}

show_requirement_report() {
  printf '\nDiagnóstico de requisitos\n'

  if native_is_ready; then
    printf '  %-28s %s\n' 'Ruta nativa' 'LISTA'
  else
    printf '  %-28s %s (%s)\n' 'Ruta nativa' 'INCOMPLETA' "$native_missing"
  fi

  if docker_tooling_is_ready; then
    printf '  %-28s %s\n' 'Docker + Compose' 'LISTO'
    if docker info >/dev/null 2>&1; then
      printf '  %-28s %s\n' 'Motor Docker' 'ACTIVO'
    else
      printf '  %-28s %s\n' 'Motor Docker' 'DETENIDO'
    fi
  else
    printf '  %-28s %s\n' 'Docker + Compose' 'FALTA'
  fi

  printf '\nEn macOS/Linux el launcher no instala software del sistema. Consulte Doc/08-ejecucion-multiplataforma.md.\n'
}

require_docker() {
  command -v docker >/dev/null 2>&1 || fail "Docker no está instalado. Consulte Doc/08-ejecucion-multiplataforma.md."
  docker compose version >/dev/null 2>&1 || fail "El plugin Docker Compose no está disponible."

  if ! docker info >/dev/null 2>&1; then
    if [ "$PLATFORM" = "macos" ] && [ -d "/Applications/Docker.app" ]; then
      printf 'Iniciando Docker Desktop'
      open -a Docker
      docker_attempt=1

      while [ "$docker_attempt" -le 60 ]; do
        if docker info >/dev/null 2>&1; then
          printf ' listo.\n'
          return 0
        fi

        printf '.'
        sleep 2
        docker_attempt=$((docker_attempt + 1))
      done

      printf '\n' >&2
    fi

    fail "Docker está instalado, pero el motor no está disponible. Inicie Docker Desktop o el servicio docker."
  fi
}

native_pid_is_running() {
  pid_file="$1"
  [ -f "$pid_file" ] || return 1
  process_id=$(sed -n '1p' "$pid_file")
  [ -n "$process_id" ] && kill -0 "$process_id" 2>/dev/null
}

stop_pid() {
  pid_file="$1"
  process_label="$2"

  if native_pid_is_running "$pid_file"; then
    process_id=$(sed -n '1p' "$pid_file")
    kill "$process_id" 2>/dev/null || true
    stop_attempt=1

    while [ "$stop_attempt" -le 20 ] && kill -0 "$process_id" 2>/dev/null; do
      sleep 1
      stop_attempt=$((stop_attempt + 1))
    done

    if kill -0 "$process_id" 2>/dev/null; then
      kill -9 "$process_id" 2>/dev/null || true
    fi

    printf '%s detenido.\n' "$process_label"
  fi

  rm -f "$pid_file"
}

stop_native() {
  stop_pid "$RUN_DIR/frontend.pid" "Frontend nativo"
  stop_pid "$RUN_DIR/backend.pid" "Backend nativo"
}

show_native_status() {
  if native_pid_is_running "$RUN_DIR/backend.pid"; then
    printf 'Backend nativo:  activo (PID %s)\n' "$(sed -n '1p' "$RUN_DIR/backend.pid")"
  else
    printf 'Backend nativo:  detenido\n'
  fi

  if native_pid_is_running "$RUN_DIR/frontend.pid"; then
    printf 'Frontend nativo: activo (PID %s)\n' "$(sed -n '1p' "$RUN_DIR/frontend.pid")"
  else
    printf 'Frontend nativo: detenido\n'
  fi
}

show_diagnostics() {
  if [ "$ACTIVE_MODE" = "docker" ]; then
    docker compose ps >&2 || true
    docker compose logs --tail=80 >&2 || true
  else
    printf '\nBackend:\n' >&2
    tail -n 80 "$RUN_DIR/backend.log" 2>/dev/null >&2 || true
    printf '\nFrontend:\n' >&2
    tail -n 80 "$RUN_DIR/frontend.log" 2>/dev/null >&2 || true
  fi
}

wait_for_url() {
  url="$1"
  service_name="$2"
  max_attempts="$3"

  if ! command -v curl >/dev/null 2>&1; then
    printf 'curl no está disponible; se omite la comprobación HTTP de %s.\n' "$service_name"
    return 0
  fi

  printf 'Esperando %s' "$service_name"
  request_attempt=1

  while [ "$request_attempt" -le "$max_attempts" ]; do
    if curl --fail --silent --max-time 3 "$url" >/dev/null 2>&1; then
      printf ' listo.\n'
      return 0
    fi

    printf '.'
    sleep 2
    request_attempt=$((request_attempt + 1))
  done

  printf '\nTiempo de espera agotado para %s.\n' "$service_name" >&2
  show_diagnostics
  return 1
}

print_urls() {
  printf '\nAGAVAL está disponible en:\n'
  printf '  Frontend: http://%s:%s\n' "$public_host" "$frontend_port"
  printf '  API:      http://%s:%s\n' "$public_host" "$backend_port"
}

start_docker() {
  ACTIVE_MODE="docker"
  require_docker
  docker compose config --quiet

  if [ "$DETACHED" = "true" ] && [ "$BUILD" = "true" ]; then
    docker compose up --detach --build
  elif [ "$DETACHED" = "true" ]; then
    docker compose up --detach
  elif [ "$BUILD" = "true" ]; then
    docker compose up --build
  else
    docker compose up
  fi

  if [ "$DETACHED" = "true" ]; then
    wait_for_url "http://localhost:${backend_port}/health" "la API" 90
    wait_for_url "http://localhost:${frontend_port}" "el frontend" 30
    docker compose ps
    print_urls
    printf '\nModo seleccionado: Docker. Use ./start.sh --logs o ./start.sh --stop.\n'
  fi
}

prepare_native_dependencies() {
  printf 'Restaurando backend .NET...\n'
  "$DOTNET_EXEC" restore "$SCRIPT_DIR/backend/Agaval.Inventory.slnx"

  if [ ! -d "$SCRIPT_DIR/frontend/node_modules" ] || [ "$SCRIPT_DIR/frontend/package-lock.json" -nt "$SCRIPT_DIR/frontend/node_modules/.package-lock.json" ]; then
    printf 'Instalando dependencias del frontend...\n'
    (cd "$SCRIPT_DIR/frontend" && "$NPM_EXEC" ci)
  fi
}

write_native_proxy() {
  cat > "$RUN_DIR/proxy.native.json" <<EOF
{
  "/api": {
    "target": "http://localhost:${backend_port}",
    "secure": false,
    "changeOrigin": true
  }
}
EOF
}

start_native() {
  ACTIVE_MODE="native"
  require_native
  mkdir -p "$RUN_DIR"

  if native_pid_is_running "$RUN_DIR/backend.pid" || native_pid_is_running "$RUN_DIR/frontend.pid"; then
    fail "Ya existe una ejecución nativa. Use ./start.sh --status o ./start.sh --stop."
  fi

  prepare_native_dependencies
  write_native_proxy

  (
    trap '' HUP
    cd "$SCRIPT_DIR/backend"
    export ASPNETCORE_ENVIRONMENT="Development"
    export ASPNETCORE_URLS="http://0.0.0.0:${backend_port}"
    export ConnectionStrings__Database="$NATIVE_CONNECTION"
    export Database__ApplyMigrationsOnStartup="true"
    export Cors__AllowedOrigins__0="http://localhost:${frontend_port}"
    exec "$DOTNET_EXEC" run \
      --project src/Agaval.Inventory.Api/Agaval.Inventory.Api.csproj \
      --no-launch-profile \
      --no-restore
  ) </dev/null > "$RUN_DIR/backend.log" 2>&1 &
  backend_pid=$!
  printf '%s\n' "$backend_pid" > "$RUN_DIR/backend.pid"

  (
    trap '' HUP
    cd "$SCRIPT_DIR/frontend"
    exec "$NPM_EXEC" start -- \
      --host 0.0.0.0 \
      --port "$frontend_port" \
      --proxy-config "$RUN_DIR/proxy.native.json"
  ) </dev/null > "$RUN_DIR/frontend.log" 2>&1 &
  frontend_pid=$!
  printf '%s\n' "$frontend_pid" > "$RUN_DIR/frontend.pid"

  if ! wait_for_url "http://localhost:${backend_port}/health" "la API nativa" 90; then
    stop_native
    return 1
  fi

  if ! wait_for_url "http://localhost:${frontend_port}" "el frontend nativo" 45; then
    stop_native
    return 1
  fi

  show_native_status
  print_urls
  printf '\nModo seleccionado: nativo. Logs en .run/.\n'

  if [ "$DETACHED" = "false" ]; then
    trap 'stop_native; exit 130' INT TERM
    tail -f "$RUN_DIR/backend.log" "$RUN_DIR/frontend.log"
  fi
}

forward_to_windows() {
  command -v powershell.exe >/dev/null 2>&1 || fail "Use start.cmd o start.ps1 desde PowerShell."
  command -v cygpath >/dev/null 2>&1 || fail "No se pudo convertir la ruta para PowerShell."
  powershell_script=$(cygpath -w "$SCRIPT_DIR/start.ps1")
  set -- -NoProfile -ExecutionPolicy Bypass -File "$powershell_script" -Mode "$MODE"

  [ "$DETACHED" = "false" ] && set -- "$@" -Foreground
  [ "$BUILD" = "false" ] && set -- "$@" -NoBuild
  [ "$ACTION" = "logs" ] && set -- "$@" -Logs
  [ "$ACTION" = "status" ] && set -- "$@" -Status
  [ "$ACTION" = "stop" ] && set -- "$@" -Stop
  [ "$ACTION" = "check" ] && set -- "$@" -Check
  [ "$NO_INSTALL" = "true" ] && set -- "$@" -NoInstall
  printf 'Windows detectado: se delega el diagnóstico y la instalación asistida a start.ps1.\n'

  if powershell.exe "$@"; then
    exit 0
  else
    windows_exit_code=$?
  fi

  printf '\nEl inicio terminó con un error. El detalle quedó en .run/launcher-error.log.\n' >&2

  if [ -t 0 ]; then
    printf 'Presione Enter para cerrar esta ventana...' >&2
    IFS= read -r _ || true
  fi

  exit "$windows_exit_code"
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --mode)
      [ "$#" -ge 2 ] || fail "--mode requiere auto, docker o native."
      MODE="$2"
      MODE_FROM_CLI="true"
      shift
      ;;
    --mode=*)
      MODE=${1#*=}
      MODE_FROM_CLI="true"
      ;;
    --docker)
      MODE="docker"
      MODE_FROM_CLI="true"
      ;;
    --native)
      MODE="native"
      MODE_FROM_CLI="true"
      ;;
    --foreground)
      DETACHED="false"
      ;;
    --no-build)
      BUILD="false"
      ;;
    --check)
      ACTION="check"
      ;;
    --no-install)
      NO_INSTALL="true"
      ;;
    --logs)
      ACTION="logs"
      ;;
    --status)
      ACTION="status"
      ;;
    --stop)
      ACTION="stop"
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      usage >&2
      fail "Opción no reconocida: $1"
      ;;
  esac
  shift
done

case "$MODE" in
  auto|docker|native) ;;
  *) fail "Modo inválido: $MODE" ;;
esac

detect_platform

if [ "$PLATFORM" = "windows-shell" ]; then
  forward_to_windows
fi

ensure_environment
frontend_port=${FRONTEND_PORT:-$(read_env "FRONTEND_PORT" "4200")}
backend_port=${BACKEND_PORT:-$(read_env "BACKEND_PORT" "5100")}
public_host=${PUBLIC_HOST:-$(read_env "PUBLIC_HOST" "localhost")}

if [ "$MODE_FROM_CLI" = "false" ]; then
  MODE=${RUN_MODE:-$(read_env "RUN_MODE" "auto")}
fi

case "$ACTION" in
  logs)
    if native_pid_is_running "$RUN_DIR/backend.pid" || native_pid_is_running "$RUN_DIR/frontend.pid"; then
      tail -f "$RUN_DIR/backend.log" "$RUN_DIR/frontend.log"
    else
      require_docker
      docker compose logs --follow --tail=100
    fi
    ;;
  status)
    show_native_status
    if docker_engine_is_ready; then
      docker compose ps
    else
      printf 'Docker:           no disponible o detenido\n'
    fi
    ;;
  stop)
    stop_native
    if docker_engine_is_ready; then
      docker compose down
      printf 'Contenedores detenidos. El volumen SQL Server se conservó.\n'
    fi
    ;;
  check)
    show_requirement_report
    printf '\nDiagnóstico terminado. No se instaló software ni se iniciaron servicios.\n'
    ;;
  start)
    case "$MODE" in
      native)
        start_native
        ;;
      docker)
        start_docker
        ;;
      auto)
        if native_is_ready; then
          printf 'Requisitos nativos detectados; se usará ejecución nativa.\n'
          start_native
        else
          printf 'Modo nativo no disponible (%s); se usará Docker.\n' "$native_missing"
          start_docker
        fi
        ;;
    esac
    ;;
esac
