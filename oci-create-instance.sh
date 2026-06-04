#!/bin/bash
# OCI 인스턴스 자동 생성 스크립트
# Capacity가 없으면 5분 간격으로 재시도

COMPARTMENT_ID="ocid1.tenancy.oc1..aaaaaaaahm7wyrtg6yectqmnibxuhjkr5mfe2rov2o2xi6earbtblyb3g4fa"
SUBNET_ID="ocid1.subnet.oc1.ap-chuncheon-1.aaaaaaaa7imck3peunxl7a5dzqiploelm7fupauv2zcodsdm6rydjc2wlwta"
AD="lCOr:AP-CHUNCHEON-1-AD-1"
IMAGE_ID="ocid1.image.oc1.ap-chuncheon-1.aaaaaaaalcmf2em45er7hd7rc3mfm24ylgfogqefet6ajzujjx6jme7blosq"
SSH_KEY="$(cat ~/.ssh/nearbook_deploy.pub)"

ATTEMPT=0

while true; do
  ATTEMPT=$((ATTEMPT + 1))
  echo "[$(date)] 시도 #${ATTEMPT}..."

  RESULT=$(oci compute instance launch \
    --compartment-id "$COMPARTMENT_ID" \
    --availability-domain "$AD" \
    --display-name "nearbook-api" \
    --shape "VM.Standard.A1.Flex" \
    --shape-config '{"ocpus": 1, "memoryInGBs": 6}' \
    --image-id "$IMAGE_ID" \
    --subnet-id "$SUBNET_ID" \
    --assign-public-ip true \
    --ssh-authorized-keys-file /dev/stdin <<< "$SSH_KEY" \
    2>&1)

  if echo "$RESULT" | grep -q '"lifecycle-state"'; then
    echo ""
    echo "============================================"
    echo "  인스턴스 생성 성공!"
    echo "============================================"
    echo "$RESULT" | python3 -c "
import sys, json
data = json.load(sys.stdin)['data']
print(f\"ID: {data['id']}\")
print(f\"상태: {data['lifecycle-state']}\")
print(f\"이름: {data['display-name']}\")
" 2>/dev/null || echo "$RESULT"
    break
  fi

  echo "  Capacity 없음. 5분 후 재시도..."
  echo "  에러: $(echo "$RESULT" | grep -o '"message": "[^"]*"' | head -1)"
  echo ""
  sleep 300
done
