#!/usr/bin/env bash
# Tenta criar VM A1 em todos os ADs da região (Out of host capacity é comum).
set -euo pipefail
export OCI_CLI_SUPPRESS_FILE_PERMISSIONS_WARNING=True

CID=ocid1.tenancy.oc1..aaaaaaaabxcjkz7dxntzaa6jo3kagtrgmtyffqdamkze4x4qpyzdxeurnf2q
REGION=sa-saopaulo-1
SUBNET=ocid1.subnet.oc1.sa-saopaulo-1.aaaaaaaakqk4g2sq3zavqvqvjnaci2chyx7t36nyq7xbznd3dt6vesuqfomq
SHAPE=VM.Standard.A1.Flex
SSH_KEY=/c/Users/Stanley/.ssh/id_ed25519_oracle.pub

IMAGE=$(oci compute image list --compartment-id "$CID" --region "$REGION" \
  --operating-system "Canonical Ubuntu" --operating-system-version "24.04" \
  --shape "$SHAPE" --sort-by TIMECREATED --sort-order DESC --query 'data[0].id' --raw-output)

ADS=$(oci iam availability-domain list --compartment-id "$CID" --region "$REGION" --query 'data[].name' --raw-output)
INSTANCE_ID=""

for AD in $ADS; do
  echo "==> Tentando AD: $AD"
  if INSTANCE_ID=$(oci compute instance launch \
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
    --query 'data.id' --raw-output 2>/tmp/oci-launch.err); then
    echo "Instância criada: $INSTANCE_ID (AD $AD)"
    break
  else
    echo "Falhou em $AD: $(cat /tmp/oci-launch.err | head -3)"
    INSTANCE_ID=""
  fi
done

if [ -z "$INSTANCE_ID" ]; then
  echo "ERRO: Sem capacidade A1 em nenhum AD de $REGION."
  echo "Tente novamente mais tarde ou crie manualmente no Console (Compute > Instances > Create)."
  exit 1
fi

for i in $(seq 1 60); do
  STATE=$(oci compute instance get --instance-id "$INSTANCE_ID" --region "$REGION" \
    --query 'data."lifecycle-state"' --raw-output)
  echo "Estado: $STATE ($i/60)"
  [ "$STATE" = "RUNNING" ] && break
  sleep 15
done

PUBLIC_IP=$(oci compute instance list-vnics --instance-id "$INSTANCE_ID" --region "$REGION" \
  --query 'data[0]."public-ip"' --raw-output)

echo "PUBLIC_IP=$PUBLIC_IP"
echo "$PUBLIC_IP" > /tmp/app-audit-oracle-ip
