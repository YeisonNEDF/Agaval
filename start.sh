#!/bin/sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$SCRIPT_DIR"

ACTION="start"
DETACHED="true"
BUILD="true"

usage() {
  cat <<'EOF'
Uso: ./start.sh [opción]

Opciones:
  --foreground   Levanta los servicios mostrando los logs en primer plano.
  --no-build     Levanta los servicios sin reconstruir las imágenes.
  --logs         Sigue los logs de todos los servicios.
  --status       Muestra el estado de los servicios.
  --stop         Detiene los servicios sin eliminar los datos de SQL Server.
  -h, --help     Muestra esta ayuda.
EOF
}

fail() {
  printf 'Error: %s\n' "$1" >&2
  exit 1
}

require_docker() {
  command -v docker >/dev/null 2>&1 || fail "Docker no está instalado. Consulte la sección 'Requisito único' del README."
  docker compose version >/dev/null 2>&1 || fail "Docker Compose no está disponible."

  if ! docker info >/dev/null 2>&1; then
    if [ "$(uname -s)" = "Darwin" ] && [ -d "/Applications/Docker.app" ]; then
      printf 'Iniciando Docker Desktop'
      open -a Docker
      attempt=1

      while [ "$attempt" -le 60 ]; do
        if docker info >/dev/null 2>&1; then
          printf ' listo.\n'
          return 0
        fi

        printf '.'
        sleep 2
        attempt=$((attempt + 1))
      done

      printf '\n' >&2
    fi

    fail "Docker está instalado, pero el motor no está disponible. Inicie Docker Desktop e intente nuevamente."
  fi
}

prepare_environment() {
  [ -f ".env.example" ] || fail "No se encontró .env.example en la raíz del proyecto."

  if [ ! -f ".env" ]; then
    cp ".env.example" ".env"
    chmod 600 ".env"
    printf 'Se creó .env a partir de .env.example.\n'
  fi

  docker compose config --quiet
}

read_env() {
  key="$1"
  fallback="$2"
  value=$(awk -F= -v requested_key="$key" '$1 == requested_key { sub(/^[^=]*=/, ""); print; exit }' .env)

  if [ -z "$value" ]; then
    value="$fallback"
  fi

  printf '%s' "$value"
}

wait_for_url() {
  url="$1"
  service_name="$2"
  max_attempts="$3"

  if ! command -v curl >/dev/null 2>&1; then
    printf 'curl no está disponible; se omite la comprobación HTTP de %s.\n' "$service_name"
    return 0
  fi

  printf 'Esperando a %s' "$service_name"
  attempt=1

  while [ "$attempt" -le "$max_attempts" ]; do
    if curl --fail --silent --max-time 3 "$url" >/dev/null 2>&1; then
      printf ' listo.\n'
      return 0
    fi

    if docker compose ps --status exited --quiet | grep -q .; then
      printf '\nUno de los servicios terminó inesperadamente.\n' >&2
      docker compose ps >&2
      docker compose logs --tail=80 >&2
      return 1
    fi

    printf '.'
    sleep 2
    attempt=$((attempt + 1))
  done

  printf '\nTiempo de espera agotado para %s.\n' "$service_name" >&2
  docker compose ps >&2
  docker compose logs --tail=80 >&2
  return 1
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --foreground)
      DETACHED="false"
      ;;
    --no-build)
      BUILD="false"
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

require_docker

case "$ACTION" in
  logs)
    docker compose logs --follow --tail=100
    ;;
  status)
    docker compose ps
    ;;
  stop)
    docker compose down
    printf 'Servicios detenidos. Los datos de SQL Server se conservaron.\n'
    ;;
  start)
    prepare_environment

    frontend_port=${FRONTEND_PORT:-$(read_env "FRONTEND_PORT" "4200")}
    backend_port=${BACKEND_PORT:-$(read_env "BACKEND_PORT" "5100")}
    public_host=${PUBLIC_HOST:-$(read_env "PUBLIC_HOST" "localhost")}

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

      printf '\nAGAVAL está disponible en:\n'
      printf '  Frontend: http://%s:%s\n' "$public_host" "$frontend_port"
      printf '  API:      http://%s:%s\n' "$public_host" "$backend_port"
      printf '\nUse ./start.sh --logs para ver los logs y ./start.sh --stop para detenerlo.\n'
    fi
    ;;
esac
