#!/usr/bin/env bash
# Tenta criar VM A1 em regiões inscritas na tenancy + shapes 1/6 e 2/12.
set -euo pipefail
export OCI_CLI_SUPPRESS_FILE_PERMISSIONS_WARNING=True

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

CID="${OCI_COMPARTMENT_OCID:-${OCI_TENANCY_OCID:?Defina OCI_TENANCY_OCID}}"
SSH_KEY="${OCI_SSH_KEY_FILE:-/c/Users/Stanley/.ssh/id_ed25519_oracle.pub}"
SHAPE=VM.Standard.A1.Flex
INSTANCE_NAME="${OCI_INSTANCE_NAME:-app-audit-vm}"
STATE_FILE="${OCI_STATE_FILE:-/tmp/app-audit-oracle-state.env}"
IP_FILE="${OCI_IP_FILE:-/tmp/app-audit-oracle-ip}"

SHAPE_CONFIGS=(
  '{"ocpus":1,"memoryInGBs":6}'
  '{"ocpus":2,"memoryInGBs":12}'
)

list_subscribed_regions() {
  if [[ -n "${OCI_REGIONS:-}" ]]; then
    echo "$OCI_REGIONS"
    return
  fi
  oci iam region-subscription list --tenancy-id "$CID" --output json \
    | python -c "import json,sys; d=json.load(sys.stdin)['data']; home=[x['region-name'] for x in d if x.get('is-home-region')]; rest=[x['region-name'] for x in d if not x.get('is-home-region') and x.get('status')=='READY']; print(' '.join(home+rest))"
}

list_availability_domains() {
  local region=$1
  oci iam availability-domain list --compartment-id "$CID" --region "$region" --output json \
    | python -c "import json,sys; [print(x['name'].strip()) for x in json.load(sys.stdin)['data']]"
}

load_network() {
  local region=$1
  export OCI_REGION="$region"
  OCI_VCN_ID=""
  OCI_SUBNET_ID=""
  while IFS= read -r line; do
    case "$line" in
      OCI_*=* ) export "$line" ;;
    esac
  done < <(OCI_REGION="$region" bash "$SCRIPT_DIR/02-ensure-network.sh" 2>&1 | grep '^OCI_')
  [[ -n "${OCI_SUBNET_ID:-}" && "$OCI_SUBNET_ID" != "null" ]]
}

# Já existe VM running?
REGIONS=$(list_subscribed_regions)
echo "Regiões inscritas: $REGIONS"
if [[ $(echo "$REGIONS" | wc -w) -lt 2 ]]; then
  echo "DICA: Para tentar Canadá/EUA, inscreva regiões em Console > Perfil > Region Management > Subscribe (ex.: ca-montreal-1)." >&2
fi

for REGION in $REGIONS; do
  EXISTING=$(oci compute instance list --compartment-id "$CID" --region "$REGION" \
    --display-name "$INSTANCE_NAME" --lifecycle-state RUNNING \
    --query 'data[0].id' --raw-output 2>/dev/null || true)
  if [[ -n "$EXISTING" && "$EXISTING" != "null" ]]; then
    echo "VM existente em $REGION: $EXISTING"
    PUBLIC_IP=$(oci compute instance list-vnics --instance-id "$EXISTING" --region "$REGION" \
      --query 'data[0]."public-ip"' --raw-output)
    {
      echo "OCI_REGION=$REGION"
      echo "PUBLIC_IP=$PUBLIC_IP"
      echo "INSTANCE_ID=$EXISTING"
    } > "$STATE_FILE"
    echo "$PUBLIC_IP" > "$IP_FILE"
    echo "PUBLIC_IP=$PUBLIC_IP"
    exit 0
  fi
done

launch_try() {
  local region=$1 ad=$2 subnet=$3 image=$4 shape_cfg=$5
  oci compute instance launch \
    --availability-domain "$ad" \
    --compartment-id "$CID" \
    --display-name "$INSTANCE_NAME" \
    --shape "$SHAPE" \
    --shape-config "$shape_cfg" \
    --image-id "$image" \
    --subnet-id "$subnet" \
    --assign-public-ip true \
    --ssh-authorized-keys-file "$SSH_KEY" \
    --boot-volume-size-in-gbs 50 \
    --region "$region" \
    --query 'data.id' --raw-output 2>/tmp/oci-launch-last.err
}

oci_err_summary() {
  python - <<'PY' 2>/dev/null || head -1 /tmp/oci-launch-last.err
import json, re
text = open("/tmp/oci-launch-last.err", errors="replace").read()
for block in re.findall(r"\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}", text, re.S):
    try:
        j = json.loads(block)
        if j.get("message"):
            print(j["message"])
            raise SystemExit
        if j.get("code"):
            print(j["code"])
            raise SystemExit
    except json.JSONDecodeError:
        continue
m = re.search(r'"message":\s*"([^"]+)"', text)
print(m.group(1) if m else text.splitlines()[0][:200])
PY
}

for REGION in $REGIONS; do
  echo ""
  echo "=========================================="
  echo " Região: $REGION"
  echo "=========================================="

  load_network "$REGION" || { echo "Rede indisponível em $REGION"; continue; }
  SUBNET="$OCI_SUBNET_ID"

  IMAGE=$(oci compute image list --compartment-id "$CID" --region "$REGION" \
    --operating-system "Canonical Ubuntu" --operating-system-version "24.04" \
    --shape "$SHAPE" --sort-by TIMECREATED --sort-order DESC \
    --query 'data[0].id' --raw-output 2>/dev/null || true)
  if [[ -z "$IMAGE" || "$IMAGE" == "null" ]]; then
    IMAGE=$(oci compute image list --compartment-id "$CID" --region "$REGION" \
      --operating-system "Canonical Ubuntu" --operating-system-version "22.04" \
      --shape "$SHAPE" --sort-by TIMECREATED --sort-order DESC \
      --query 'data[0].id' --raw-output 2>/dev/null || true)
  fi
  if [[ -z "$IMAGE" || "$IMAGE" == "null" ]]; then
    echo "Imagem A1 não disponível em $REGION, pulando."
    continue
  fi

  mapfile -t AD_LIST < <(list_availability_domains "$REGION")

  for AD in "${AD_LIST[@]}"; do
    for shape_cfg in "${SHAPE_CONFIGS[@]}"; do
      echo "==> Tentando $REGION / $AD / $shape_cfg"
      if INSTANCE_ID=$(launch_try "$REGION" "$AD" "$SUBNET" "$IMAGE" "$shape_cfg"); then
        echo "Instância criada: $INSTANCE_ID"
        for i in $(seq 1 60); do
          STATE=$(oci compute instance get --instance-id "$INSTANCE_ID" --region "$REGION" \
            --query 'data."lifecycle-state"' --raw-output)
          echo "  Estado: $STATE ($i/60)"
          [[ "$STATE" == "RUNNING" ]] && break
          [[ "$STATE" == "TERMINATED" || "$STATE" == "TERMINATING" ]] && continue 2
          sleep 15
        done
        PUBLIC_IP=$(oci compute instance list-vnics --instance-id "$INSTANCE_ID" --region "$REGION" \
          --query 'data[0]."public-ip"' --raw-output)
        {
          echo "OCI_REGION=$REGION"
          echo "PUBLIC_IP=$PUBLIC_IP"
          echo "INSTANCE_ID=$INSTANCE_ID"
        } > "$STATE_FILE"
        echo "$PUBLIC_IP" > "$IP_FILE"
        echo ""
        echo "SUCESSO em $REGION"
        echo "PUBLIC_IP=$PUBLIC_IP"
        exit 0
      else
        echo "  Falhou: $(oci_err_summary)"
        sleep 10
      fi
    done
  done
done

echo "ERRO: Sem capacidade A1 em todas as regiões testadas."
exit 1
