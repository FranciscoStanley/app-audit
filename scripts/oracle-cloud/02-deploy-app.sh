#!/usr/bin/env bash
# Deploy App Audit na VM Oracle Cloud.
# Pré-requisitos: 01-bootstrap-vm.sh, .env preenchido na raiz do projeto.
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/FranciscoStanley/app-audit.git}"
BRANCH="${BRANCH:-main}"
INSTALL_DIR="${INSTALL_DIR:-/opt/app-audit}"
COMPOSE_FILE="docker-compose.oracle.yml"
USE_GHCR="${USE_GHCR:-false}"
GHCR_OWNER="${GHCR_OWNER:-franciscostanley}"
APP_VERSION="${APP_VERSION:-latest}"

cd "$INSTALL_DIR"

if [[ ! -f .env ]]; then
  echo "Arquivo .env não encontrado em $INSTALL_DIR"
  echo "Copie .env.oracle.example para .env e preencha JWT_SECRET, ADMIN_PASSWORD, GITHUB_TOKEN e PUBLIC_IP."
  exit 1
fi

# shellcheck disable=SC1091
set -a
source .env
set +a

if grep -q 'PUBLIC_IP' .env 2>/dev/null; then
  echo "ERRO: substitua PUBLIC_IP no .env pelo IP público real da VM."
  exit 1
fi

if [[ -z "${JWT_SECRET:-}" || ${#JWT_SECRET} -lt 32 ]]; then
  echo "ERRO: JWT_SECRET deve ter pelo menos 32 caracteres."
  exit 1
fi

echo "==> Atualizando código..."
if [[ -d .git ]]; then
  git fetch origin
  git checkout "$BRANCH"
  git pull origin "$BRANCH"
else
  git clone --branch "$BRANCH" "$REPO_URL" "$INSTALL_DIR"
  cd "$INSTALL_DIR"
fi

COMPOSE_CMD=(docker compose -f "$COMPOSE_FILE")

if [[ "$USE_GHCR" == "true" ]]; then
  echo "==> Usando imagens GHCR ${GHCR_OWNER}..."
  export BACKEND_IMAGE="ghcr.io/${GHCR_OWNER}/app-audit-backend:${APP_VERSION}"
  export FRONTEND_IMAGE="ghcr.io/${GHCR_OWNER}/app-audit-frontend:${APP_VERSION}"
  docker pull "$BACKEND_IMAGE"
  docker pull "$FRONTEND_IMAGE"
  "${COMPOSE_CMD[@]}" up -d --no-build
else
  echo "==> Build local (NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL})..."
  "${COMPOSE_CMD[@]}" up -d --build
fi

echo "==> Aguardando health checks..."
sleep 15
"${COMPOSE_CMD[@]}" ps

PUBLIC_URL="${FRONTEND_URL:-http://localhost:3001}"
API_URL="${NEXT_PUBLIC_API_URL:-http://localhost:3000}"

cat <<EOF

Deploy concluído.

  Frontend: ${PUBLIC_URL}
  API:      ${API_URL}
  Health:   ${API_URL}/health

Logs: docker compose -f ${COMPOSE_FILE} logs -f

EOF
