#!/usr/bin/env bash
# Executar na VM após cloud-init ou bootstrap, com .env já presente em /opt/app-audit
set -euo pipefail

INSTALL_DIR="${INSTALL_DIR:-/opt/app-audit}"
cd "$INSTALL_DIR"

if [[ ! -f .env ]]; then
  echo "ERRO: /opt/app-audit/.env não encontrado."
  echo "Envie do PC: scripts/oracle-cloud/push-env.ps1 -PublicIp SEU_IP"
  exit 1
fi

if grep -q 'PUBLIC_IP' .env 2>/dev/null; then
  echo "ERRO: .env ainda contém PUBLIC_IP — substitua pelo IP da VM."
  exit 1
fi

bash scripts/oracle-cloud/02-deploy-app.sh
bash scripts/oracle-cloud/03-health-check.sh
