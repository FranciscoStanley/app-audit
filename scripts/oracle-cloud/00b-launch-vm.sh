#!/usr/bin/env bash
# Launch A1 com retry (timeout / out of capacity).
set -euo pipefail
export OCI_CLI_SUPPRESS_FILE_PERMISSIONS_WARNING=True

CID=ocid1.tenancy.oc1..aaaaaaaabxcjkz7dxntzaa6jo3kagtrgmtyffqdamkze4x4qpyzdxeurnf2q
REGION=sa-saopaulo-1
SUBNET=ocid1.subnet.oc1.sa-saopaulo-1.aaaaaaaakqk4g2sq3zavqvqvjnaci2chyx7t36nyq7xbznd3dt6vesuqfomq
SHAPE=VM.Standard.A1.Flex
SSH_KEY=/c/Users/Stanley/.ssh/id_ed25519_oracle.pub
AD=ZOQX:SA-SAOPAULO-1-AD-1

EXISTING=$(oci compute instance list --compartment-id "$CID" --region "$REGION" \
  --display-name app-audit-vm --query 'data[?\"lifecycle-state\"!=`TERMINATED`] | [0].id' --raw-output 2>/dev/null || true)
if [[ -n "$EXISTING" && "$EXISTING" != "null" ]]; then
  echo "Instancia existente: $EXISTING"
  INSTANCE_ID="$EXISTING"
else
  IMAGE=$(oci compute image list --compartment-id "$CID" --region "$REGION" \
    --operating-system "Canonical Ubuntu" --operating-system-version "24.04" \
    --shape "$SHAPE" --sort-by TIMECREATED --sort-order DESC --query 'data[0].id' --raw-output)

  for attempt in 1 2 3; do
    echo "==> Tentativa $attempt/3..."
    if OUT=$(oci compute instance launch \
      --availability-domain "$AD" \
      --compartment-id "$CID" \
      --display-name app-audit-vm \
      --shape "$SHAPE" \
      --shape-config '{"ocpus":1,"memoryInGBs":6}' \
      --image-id "$IMAGE" \
      --subnet-id "$SUBNET" \
      --assign-public-ip true \
      --ssh-authorized-keys-file "$SSH_KEY" \
      --boot-volume-size-in-gbs 50 \
      --region "$REGION" \
      --query 'data.id' --raw-output 2>&1); then
      INSTANCE_ID="$OUT"
      echo "Criada: $INSTANCE_ID"
      break
    else
      echo "$OUT" | head -5
      sleep 20
    fi
  done
fi

[[ -n "${INSTANCE_ID:-}" && "$INSTANCE_ID" != "null" ]] || { echo "ERRO: nao foi possivel criar VM"; exit 1; }

for i in $(seq 1 80); do
  STATE=$(oci compute instance get --instance-id "$INSTANCE_ID" --region "$REGION" \
    --query 'data."lifecycle-state"' --raw-output 2>/dev/null || echo "UNKNOWN")
  echo "Estado: $STATE ($i/80)"
  [[ "$STATE" == "RUNNING" ]] && break
  [[ "$STATE" == "TERMINATED" || "$STATE" == "TERMINATING" ]] && exit 1
  sleep 15
done

PUBLIC_IP=$(oci compute instance list-vnics --instance-id "$INSTANCE_ID" --region "$REGION" \
  --query 'data[0]."public-ip"' --raw-output)
echo "PUBLIC_IP=$PUBLIC_IP"
echo "$PUBLIC_IP" > /tmp/app-audit-oracle-ip
