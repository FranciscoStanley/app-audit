#!/usr/bin/env bash
# Verifica se API e frontend respondem na VM.
set -euo pipefail

INSTALL_DIR="${INSTALL_DIR:-/opt/app-audit}"
cd "$INSTALL_DIR"

if [[ ! -f .env ]]; then
  echo "ERRO: .env não encontrado em $INSTALL_DIR"
  exit 1
fi

# shellcheck disable=SC1091
set -a
source .env
set +a

API_URL="${NEXT_PUBLIC_API_URL:-http://127.0.0.1:3000}"
FRONTEND_URL="${FRONTEND_URL:-http://127.0.0.1:3001}"

echo "==> Health API: ${API_URL}/health"
curl -fsS "${API_URL}/health" | head -c 500
echo ""
echo "==> Frontend: ${FRONTEND_URL}"
curl -fsSI "${FRONTEND_URL}" | head -5
echo "==> Containers:"
docker compose -f docker-compose.oracle.yml ps
