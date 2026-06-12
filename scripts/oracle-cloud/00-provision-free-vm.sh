#!/usr/bin/env bash
# Provisiona VM Always Free (VM.Standard.A1.Flex) na OCI via CLI.
# Pré-requisito: API Key configurada (oci setup config) — senha do console NÃO funciona.
set -euo pipefail

REGION="${OCI_REGION:-sa-saopaulo-1}"
COMPARTMENT_ID="${OCI_COMPARTMENT_OCID:-${OCI_TENANCY_OCID:-}}"
INSTANCE_NAME="${OCI_INSTANCE_NAME:-app-audit-vm}"
SHAPE="VM.Standard.A1.Flex"
OCPUS="${OCI_OCPUS:-1}"
MEMORY_GB="${OCI_MEMORY_GB:-6}"
BOOT_GB="${OCI_BOOT_VOLUME_GB:-50}"
SSH_KEY_FILE="${OCI_SSH_KEY_FILE:-$HOME/.ssh/id_ed25519.pub}"
VCN_ID="${OCI_VCN_ID:-}"
SUBNET_ID="${OCI_SUBNET_ID:-}"

die() { echo "ERRO: $*" >&2; exit 1; }

command -v oci >/dev/null 2>&1 || die "OCI CLI não encontrado. Instale: https://docs.oracle.com/iaas/Content/API/SDKDocs/cliinstall.htm"

[[ -n "$COMPARTMENT_ID" ]] || die "Defina OCI_COMPARTMENT_OCID ou OCI_TENANCY_OCID no .env"
[[ -f "$SSH_KEY_FILE" ]] || die "Chave SSH não encontrada: $SSH_KEY_FILE"

export OCI_CLI_SUPPRESS_FILE_PERMISSIONS_WARNING=True

echo "==> Região: $REGION | Compartment: ${COMPARTMENT_ID:0:20}..."

if [[ -z "$VCN_ID" ]]; then
  echo "==> Descobrindo VCN..."
  VCN_ID=$(oci network vcn list \
    --compartment-id "$COMPARTMENT_ID" \
    --region "$REGION" \
    --query 'data[0].id' --raw-output 2>/dev/null || true)
  [[ -n "$VCN_ID" && "$VCN_ID" != "null" ]] || die "Nenhuma VCN encontrada. Crie uma no Console (VCN Wizard) ou defina OCI_VCN_ID."
fi

if [[ -z "$SUBNET_ID" ]]; then
  echo "==> Descobrindo subnet pública..."
  SUBNET_ID=$(oci network subnet list \
    --compartment-id "$COMPARTMENT_ID" \
    --vcn-id "$VCN_ID" \
    --region "$REGION" \
    --query 'data[?contains("display-name", `public`) || "prohibit-public-ip-on-vnic" == `false`] | [0].id' \
    --raw-output 2>/dev/null || true)
  if [[ -z "$SUBNET_ID" || "$SUBNET_ID" == "null" ]]; then
    SUBNET_ID=$(oci network subnet list \
      --compartment-id "$COMPARTMENT_ID" \
      --vcn-id "$VCN_ID" \
      --region "$REGION" \
      --query 'data[0].id' --raw-output)
  fi
fi
[[ -n "$SUBNET_ID" && "$SUBNET_ID" != "null" ]] || die "Subnet não encontrada. Defina OCI_SUBNET_ID."

echo "==> Liberando portas na Security List..."
SL_ID=$(oci network vcn list \
  --compartment-id "$COMPARTMENT_ID" \
  --region "$REGION" \
  --query "data[?id=='$VCN_ID'].\"default-security-list-id\" | [0]" --raw-output)

for rule in "22:SSH" "3000:app-audit-api" "3001:app-audit-frontend"; do
  PORT="${rule%%:*}"
  DESC="${rule#*:}"
  EXISTS=$(oci network security-list get --security-list-id "$SL_ID" --region "$REGION" \
    --query "data.\"ingress-security-rules\"[?tcpOptions.destinationPortRange.max==\`$PORT\`] | length(@)" \
    --raw-output 2>/dev/null || echo "0")
  if [[ "$EXISTS" == "0" ]]; then
    oci network security-list update --security-list-id "$SL_ID" --region "$REGION" \
      --ingress-security-rules "[{\"source\":\"0.0.0.0/0\",\"protocol\":\"6\",\"isStateless\":false,\"description\":\"$DESC\",\"tcpOptions\":{\"destinationPortRange\":{\"min\":$PORT,\"max\":$PORT}}}]" \
      --force >/dev/null
    echo "    + porta $PORT ($DESC)"
  else
    echo "    = porta $PORT já liberada"
  fi
done

echo "==> Buscando imagem Ubuntu aarch64 (Ampere)..."
IMAGE_ID=$(oci compute image list \
  --compartment-id "$COMPARTMENT_ID" \
  --region "$REGION" \
  --operating-system "Canonical Ubuntu" \
  --operating-system-version "24.04" \
  --shape "$SHAPE" \
  --sort-by TIMECREATED \
  --sort-order DESC \
  --query 'data[0].id' --raw-output 2>/dev/null || true)
if [[ -z "$IMAGE_ID" || "$IMAGE_ID" == "null" ]]; then
  IMAGE_ID=$(oci compute image list \
    --compartment-id "$COMPARTMENT_ID" \
    --region "$REGION" \
    --operating-system "Canonical Ubuntu" \
    --operating-system-version "22.04" \
    --shape "$SHAPE" \
    --sort-by TIMECREATED \
    --sort-order DESC \
    --query 'data[0].id' --raw-output)
fi
[[ -n "$IMAGE_ID" && "$IMAGE_ID" != "null" ]] || die "Imagem Ubuntu aarch64 não encontrada para $SHAPE."

AD=$(oci iam availability-domain list \
  --compartment-id "$COMPARTMENT_ID" \
  --region "$REGION" \
  --query 'data[0].name' --raw-output)

EXISTING=$(oci compute instance list \
  --compartment-id "$COMPARTMENT_ID" \
  --region "$REGION" \
  --display-name "$INSTANCE_NAME" \
  --lifecycle-state RUNNING \
  --query 'data[0].id' --raw-output 2>/dev/null || true)

if [[ -n "$EXISTING" && "$EXISTING" != "null" ]]; then
  INSTANCE_ID="$EXISTING"
  echo "==> Instância $INSTANCE_NAME já existe: $INSTANCE_ID"
else
  echo "==> Criando instância $INSTANCE_NAME ($SHAPE: ${OCPUS} OCPU, ${MEMORY_GB} GB)..."
  INSTANCE_ID=$(oci compute instance launch \
    --availability-domain "$AD" \
    --compartment-id "$COMPARTMENT_ID" \
    --display-name "$INSTANCE_NAME" \
    --shape "$SHAPE" \
    --shape-config "{\"ocpus\":$OCPUS,\"memoryInGBs\":$MEMORY_GB}" \
    --image-id "$IMAGE_ID" \
    --subnet-id "$SUBNET_ID" \
    --assign-public-ip true \
    --ssh-authorized-keys-file "$SSH_KEY_FILE" \
    --boot-volume-size-in-gbs "$BOOT_GB" \
    --region "$REGION" \
    --wait-for-state RUNNING \
    --query 'data.id' --raw-output)
  echo "==> Instância criada: $INSTANCE_ID"
fi

echo "==> Obtendo IP público..."
sleep 5
PUBLIC_IP=$(oci compute instance list-vnics \
  --instance-id "$INSTANCE_ID" \
  --region "$REGION" \
  --query 'data[0]."public-ip"' --raw-output)

[[ -n "$PUBLIC_IP" && "$PUBLIC_IP" != "null" ]] || die "IP público ainda não disponível. Aguarde e consulte o Console."

mkdir -p "$(dirname "${OCI_INSTANCE_IP_FILE:-/tmp/app-audit-oracle-ip}")"
echo "$PUBLIC_IP" > "${OCI_INSTANCE_IP_FILE:-/tmp/app-audit-oracle-ip}"

cat <<EOF

Provisionamento concluído (Always Free).

  Instância:  $INSTANCE_NAME
  OCID:       $INSTANCE_ID
  IP público: $PUBLIC_IP
  Região:     $REGION

Próximo passo (na sua máquina):
  PUBLIC_IP=$PUBLIC_IP bash scripts/oracle-cloud/04-prepare-oracle-env.sh
  bash scripts/oracle-cloud/05-remote-deploy.sh $PUBLIC_IP

EOF
