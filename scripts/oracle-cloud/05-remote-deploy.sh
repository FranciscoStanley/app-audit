#!/usr/bin/env bash
# Deploy remoto na VM Oracle via SSH.
# Uso: bash scripts/oracle-cloud/05-remote-deploy.sh [PUBLIC_IP]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PUBLIC_IP="${1:-${PUBLIC_IP:-}}"
SSH_KEY="${OCI_SSH_KEY_FILE:-$HOME/.ssh/id_ed25519_oracle}"
SSH_USER="${OCI_SSH_USER:-ubuntu}"
REMOTE_DIR="/opt/app-audit"
ENV_FILE="${ENV_FILE:-$ROOT/.env.oracle.local}"

[[ -n "$PUBLIC_IP" ]] || { echo "Uso: $0 PUBLIC_IP"; exit 1; }
[[ -f "$ENV_FILE" ]] || {
  echo "Arquivo $ENV_FILE não encontrado."
  echo "Execute: PUBLIC_IP=$PUBLIC_IP bash scripts/oracle-cloud/04-prepare-oracle-env.sh"
  exit 1
}

SSH_OPTS=(-o StrictHostKeyChecking=accept-new -o ConnectTimeout=30)
[[ -f "$SSH_KEY" ]] && SSH_OPTS+=(-i "$SSH_KEY")

echo "==> Aguardando SSH em ${SSH_USER}@${PUBLIC_IP}..."
for i in $(seq 1 30); do
  if ssh "${SSH_OPTS[@]}" "${SSH_USER}@${PUBLIC_IP}" "echo ok" >/dev/null 2>&1; then
    break
  fi
  [[ "$i" -eq 30 ]] && { echo "SSH indisponível após 5 min."; exit 1; }
  sleep 10
done

echo "==> Bootstrap (se necessário)..."
ssh "${SSH_OPTS[@]}" "${SSH_USER}@${PUBLIC_IP}" bash -s <<'REMOTE'
set -euo pipefail
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
fi
sudo mkdir -p /opt/app-audit
sudo chown "$USER:$USER" /opt/app-audit
if [[ ! -d /opt/app-audit/.git ]]; then
  git clone https://github.com/FranciscoStanley/app-audit.git /opt/app-audit
fi
chmod +x /opt/app-audit/scripts/oracle-cloud/*.sh 2>/dev/null || true
REMOTE

echo "==> Enviando .env..."
scp "${SSH_OPTS[@]}" "$ENV_FILE" "${SSH_USER}@${PUBLIC_IP}:${REMOTE_DIR}/.env"

echo "==> Deploy..."
ssh "${SSH_OPTS[@]}" "${SSH_USER}@${PUBLIC_IP}" "cd ${REMOTE_DIR} && git pull origin main && bash scripts/oracle-cloud/04-finalize-deploy.sh"

cat <<EOF

Deploy concluído.

  Frontend: http://${PUBLIC_IP}:3001
  API:      http://${PUBLIC_IP}:3000/health

EOF
