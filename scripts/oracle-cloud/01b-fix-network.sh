#!/usr/bin/env bash
set -euo pipefail
export OCI_CLI_SUPPRESS_FILE_PERMISSIONS_WARNING=True

REGION=sa-saopaulo-1
VCN_ID=ocid1.vcn.oc1.sa-saopaulo-1.amaaaaaa367qrhya3er42efogn4yi2pngavcyzd3r2ct3nj5vlx2thbsrmiq
IGW_ID=ocid1.internetgateway.oc1.sa-saopaulo-1.aaaaaaaav2v63ejfl2zdpl2eh7ttbthxg7cjzagpo3fienllueqmkcxrb3sa
SUBNET_ID=ocid1.subnet.oc1.sa-saopaulo-1.aaaaaaaakqk4g2sq3zavqvqvjnaci2chyx7t36nyq7xbznd3dt6vesuqfomq

RT_ID=$(oci network vcn get --vcn-id "$VCN_ID" --region "$REGION" \
  --query 'data."default-route-table-id"' --raw-output)
SL_ID=$(oci network vcn get --vcn-id "$VCN_ID" --region "$REGION" \
  --query 'data."default-security-list-id"' --raw-output)

echo "RT=$RT_ID"
echo "SL=$SL_ID"

oci network route-table update --rt-id "$RT_ID" --region "$REGION" \
  --route-rules "[{\"cidrBlock\":\"0.0.0.0/0\",\"networkEntityId\":\"$IGW_ID\"}]" --force

oci network security-list update --security-list-id "$SL_ID" --region "$REGION" \
  --ingress-security-rules "[{\"source\":\"0.0.0.0/0\",\"protocol\":\"6\",\"isStateless\":false,\"description\":\"SSH\",\"tcpOptions\":{\"destinationPortRange\":{\"min\":22,\"max\":22}}},{\"source\":\"0.0.0.0/0\",\"protocol\":\"6\",\"isStateless\":false,\"description\":\"API\",\"tcpOptions\":{\"destinationPortRange\":{\"min\":3000,\"max\":3000}}},{\"source\":\"0.0.0.0/0\",\"protocol\":\"6\",\"isStateless\":false,\"description\":\"Frontend\",\"tcpOptions\":{\"destinationPortRange\":{\"min\":3001,\"max\":3001}}},{\"source\":\"0.0.0.0/0\",\"protocol\":\"6\",\"isStateless\":false,\"description\":\"HTTP\",\"tcpOptions\":{\"destinationPortRange\":{\"min\":80,\"max\":80}}},{\"source\":\"0.0.0.0/0\",\"protocol\":\"6\",\"isStateless\":false,\"description\":\"HTTPS\",\"tcpOptions\":{\"destinationPortRange\":{\"min\":443,\"max\":443}}}]" \
  --force

echo "OCI_VCN_ID=$VCN_ID"
echo "OCI_SUBNET_ID=$SUBNET_ID"
echo "Rede configurada."
