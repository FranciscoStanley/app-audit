#!/usr/bin/env bash
# Gera .env.oracle.local a partir do .env local + IP público da VM.
# Uso: PUBLIC_IP=132.145.x.x bash scripts/oracle-cloud/04-prepare-oracle-env.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PUBLIC_IP="${PUBLIC_IP:-${1:-}}"
APP_HOST="${APP_HOST:-app-audit}"
SOURCE_ENV="${SOURCE_ENV:-$ROOT/.env}"
OUT="${OUT:-$ROOT/.env.oracle.local}"

[[ -n "$PUBLIC_IP" ]] || { echo "Uso: PUBLIC_IP=x.x.x.x $0"; exit 1; }
[[ -f "$SOURCE_ENV" ]] || { echo "ERRO: $SOURCE_ENV não encontrado"; exit 1; }

# shellcheck disable=SC1090
source "$SOURCE_ENV"

JWT_SECRET="${JWT_SECRET:?JWT_SECRET obrigatório no .env local}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:?ADMIN_PASSWORD obrigatório}"
GITHUB_TOKEN="${GITHUB_TOKEN:?GITHUB_TOKEN obrigatório}"

cat > "$OUT" <<EOF
# Gerado por 04-prepare-oracle-env.sh — NÃO commitar
NODE_ENV=production
BACKEND_PORT=3000
FRONTEND_PORT=3001

CORS_ORIGIN=http://${APP_HOST}:3001
NEXT_PUBLIC_API_URL=http://${APP_HOST}:3000
GITHUB_OAUTH_CALLBACK_URL=http://${APP_HOST}:3000/v1/auth/github/callback
FRONTEND_URL=http://${APP_HOST}:3001

JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=${JWT_EXPIRES_IN:-8h}

ADMIN_EMAIL=${ADMIN_EMAIL:-admin@empresa.com}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
ADMIN_NAME=${ADMIN_NAME:-Administrador}

SWAGGER_ENABLED=false

GITHUB_OAUTH_CLIENT_ID=${GITHUB_OAUTH_CLIENT_ID:-}
GITHUB_OAUTH_CLIENT_SECRET=${GITHUB_OAUTH_CLIENT_SECRET:-}
GITHUB_TOKEN=${GITHUB_TOKEN}
OSM_API_TOKEN=${OSM_API_TOKEN:-}

THREAT_INTEL_REFRESH_HOURS=${THREAT_INTEL_REFRESH_HOURS:-6}
THREAT_INTEL_SYNC_ON_STARTUP=${THREAT_INTEL_SYNC_ON_STARTUP:-true}
GITHUB_ADVISORY_MAX_PAGES=${GITHUB_ADVISORY_MAX_PAGES:-10}

DATA_CONTROLLER_NAME=${DATA_CONTROLLER_NAME:-App Audit}
DATA_CONTROLLER_ADDRESS=${DATA_CONTROLLER_ADDRESS:-}
PRIVACY_CONTACT_EMAIL=${PRIVACY_CONTACT_EMAIL:-}
DPO_CONTACT_EMAIL=${DPO_CONTACT_EMAIL:-}
EOF

echo "Arquivo gerado: $OUT"
echo "URLs: http://${APP_HOST}:3001 (frontend) e http://${APP_HOST}:3000 (API)"
echo "Hosts (Windows: C:\\Windows\\System32\\drivers\\etc\\hosts): ${PUBLIC_IP} ${APP_HOST}"
echo "SWAGGER_ENABLED=false (produção)"
