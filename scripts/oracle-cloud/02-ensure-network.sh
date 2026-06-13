#!/usr/bin/env bash
# Garante VCN + subnet pública em uma região OCI.
# Saída: export OCI_VCN_ID e OCI_SUBNET_ID
set -euo pipefail
export OCI_CLI_SUPPRESS_FILE_PERMISSIONS_WARNING=True

REGION="${OCI_REGION:?OCI_REGION obrigatório}"
CID="${OCI_COMPARTMENT_OCID:-${OCI_TENANCY_OCID:?OCID obrigatório}}"
VCN_NAME="${OCI_VCN_NAME:-app-audit-vcn}"
SUBNET_NAME="${OCI_SUBNET_NAME:-app-audit-public-subnet}"

VCN_ID=$(oci network vcn list --compartment-id "$CID" --region "$REGION" \
  --display-name "$VCN_NAME" --query 'data[0].id' --raw-output 2>/dev/null || true)

if [[ -z "$VCN_ID" || "$VCN_ID" == "null" ]]; then
  echo "==> [$REGION] Criando VCN $VCN_NAME..." >&2
  VCN_ID=$(oci network vcn create --compartment-id "$CID" --region "$REGION" \
    --cidr-block "10.0.0.0/16" --display-name "$VCN_NAME" --query 'data.id' --raw-output)

  IGW_ID=$(oci network internet-gateway create --compartment-id "$CID" --vcn-id "$VCN_ID" \
    --region "$REGION" --is-enabled true --display-name "app-audit-igw" --query 'data.id' --raw-output)

  RT_ID=$(oci network vcn get --vcn-id "$VCN_ID" --region "$REGION" \
    --query 'data."default-route-table-id"' --raw-output)
  SL_ID=$(oci network vcn get --vcn-id "$VCN_ID" --region "$REGION" \
    --query 'data."default-security-list-id"' --raw-output)

  oci network route-table update --rt-id "$RT_ID" --region "$REGION" \
    --route-rules "[{\"cidrBlock\":\"0.0.0.0/0\",\"networkEntityId\":\"$IGW_ID\"}]" --force >/dev/null

  oci network security-list update --security-list-id "$SL_ID" --region "$REGION" \
    --ingress-security-rules "[{\"source\":\"0.0.0.0/0\",\"protocol\":\"6\",\"isStateless\":false,\"description\":\"SSH\",\"tcpOptions\":{\"destinationPortRange\":{\"min\":22,\"max\":22}}},{\"source\":\"0.0.0.0/0\",\"protocol\":\"6\",\"isStateless\":false,\"description\":\"API\",\"tcpOptions\":{\"destinationPortRange\":{\"min\":3000,\"max\":3000}}},{\"source\":\"0.0.0.0/0\",\"protocol\":\"6\",\"isStateless\":false,\"description\":\"Frontend\",\"tcpOptions\":{\"destinationPortRange\":{\"min\":3001,\"max\":3001}}},{\"source\":\"0.0.0.0/0\",\"protocol\":\"6\",\"isStateless\":false,\"description\":\"HTTP\",\"tcpOptions\":{\"destinationPortRange\":{\"min\":80,\"max\":80}}},{\"source\":\"0.0.0.0/0\",\"protocol\":\"6\",\"isStateless\":false,\"description\":\"HTTPS\",\"tcpOptions\":{\"destinationPortRange\":{\"min\":443,\"max\":443}}}]" \
    --force >/dev/null

  SUBNET_ID=$(oci network subnet create --compartment-id "$CID" --vcn-id "$VCN_ID" \
    --region "$REGION" --cidr-block "10.0.1.0/24" --display-name "$SUBNET_NAME" \
    --prohibit-public-ip-on-vnic false --query 'data.id' --raw-output)
else
  echo "==> [$REGION] VCN existente: $VCN_ID" >&2
  SUBNET_ID=$(oci network subnet list --compartment-id "$CID" --vcn-id "$VCN_ID" \
    --region "$REGION" --display-name "$SUBNET_NAME" --query 'data[0].id' --raw-output)
  if [[ -z "$SUBNET_ID" || "$SUBNET_ID" == "null" ]]; then
    SUBNET_ID=$(oci network subnet list --compartment-id "$CID" --vcn-id "$VCN_ID" \
      --region "$REGION" --query 'data[0].id' --raw-output)
  fi
fi

export OCI_VCN_ID="$VCN_ID"
export OCI_SUBNET_ID="$SUBNET_ID"
echo "OCI_VCN_ID=$VCN_ID"
echo "OCI_SUBNET_ID=$SUBNET_ID"
