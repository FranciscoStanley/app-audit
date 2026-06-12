#!/usr/bin/env bash
# Bootstrap Ubuntu 22.04/24.04 na VM Oracle Cloud (Always Free).
# Execute como usuário com sudo na instância recém-criada.
set -euo pipefail

echo "==> Atualizando pacotes..."
sudo apt-get update -qq
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y -qq

echo "==> Instalando dependências..."
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
  ca-certificates \
  curl \
  git \
  ufw

if ! command -v docker >/dev/null 2>&1; then
  echo "==> Instalando Docker..."
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "==> Plugin Docker Compose não encontrado (deve vir com Docker recente)."
  exit 1
fi

echo "==> Configurando firewall (ufw)..."
sudo ufw allow OpenSSH
sudo ufw allow 3000/tcp comment 'app-audit API'
sudo ufw allow 3001/tcp comment 'app-audit frontend'
sudo ufw allow 80/tcp comment 'caddy http' || true
sudo ufw allow 443/tcp comment 'caddy https' || true
sudo ufw --force enable
sudo ufw status

echo "==> Criando diretório da aplicação..."
sudo mkdir -p /opt/app-audit
sudo chown "$USER:$USER" /opt/app-audit

cat <<'EOF'

Bootstrap concluído.

Próximos passos:
  1. Faça logout/login (ou newgrp docker) para usar Docker sem sudo.
  2. Abra as portas 3000 e 3001 na Security List / NSG do Console OCI.
  3. Execute: bash scripts/oracle-cloud/02-deploy-app.sh

EOF
