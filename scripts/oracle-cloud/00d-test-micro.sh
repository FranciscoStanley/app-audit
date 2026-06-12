#!/usr/bin/env bash
# Teste rápido de capacidade E2.1.Micro (fallback Always Free x86)
set -euo pipefail
export OCI_CLI_SUPPRESS_FILE_PERMISSIONS_WARNING=True
CID=ocid1.tenancy.oc1..aaaaaaaabxcjkz7dxntzaa6jo3kagtrgmtyffqdamkze4x4qpyzdxeurnf2q
REGION=sa-saopaulo-1
SUBNET=ocid1.subnet.oc1.sa-saopaulo-1.aaaaaaaakqk4g2sq3zavqvqvjnaci2chyx7t36nyq7xbznd3dt6vesuqfomq
AD=ZOQX:SA-SAOPAULO-1-AD-1
IMAGE=$(oci compute image list --compartment-id "$CID" --region "$REGION" \
  --operating-system "Canonical Ubuntu" --operating-system-version "24.04" \
  --shape VM.Standard.E2.1.Micro --query 'data[0].id' --raw-output)
echo "Tentando E2.1.Micro..."
oci compute instance launch \
  --availability-domain "$AD" \
  --compartment-id "$CID" \
  --display-name app-audit-micro-test \
  --shape VM.Standard.E2.1.Micro \
  --image-id "$IMAGE" \
  --subnet-id "$SUBNET" \
  --assign-public-ip true \
  --ssh-authorized-keys-file /c/Users/Stanley/.ssh/id_ed25519_oracle.pub \
  --region "$REGION" \
  --query 'data.id' --raw-output
