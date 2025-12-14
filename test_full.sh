#!/bin/bash

# Get fresh token
RESPONSE=$(curl -s -X POST http://localhost:4100/api/auth/login \
  -H "Content-Type: application/json" \
  -d @G:/openmeet/test_login.json)

TOKEN=$(echo $RESPONSE | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "Failed to get token. Response: $RESPONSE"
  exit 1
fi

echo "Token obtained: ${TOKEN:0:30}..."
echo ""
echo "=== Testing /api/meetings with admin auth ==="
curl -s -i "http://localhost:4100/api/meetings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
