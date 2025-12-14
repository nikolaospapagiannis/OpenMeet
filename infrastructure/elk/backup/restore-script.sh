#!/bin/bash
# Elasticsearch restore script

set -e

ELASTICSEARCH_URL="${ELASTICSEARCH_URL:-http://elasticsearch:9200}"
ELASTICSEARCH_USER="${ELASTICSEARCH_USER:-elastic}"
ELASTICSEARCH_PASSWORD="${ELASTICSEARCH_PASSWORD:-changeme}"
SNAPSHOT_REPO_NAME="${SNAPSHOT_REPO_NAME:-elk_backups}"
SNAPSHOT_NAME="${1}"

if [ -z "$SNAPSHOT_NAME" ]; then
  echo "Usage: $0 <snapshot-name>"
  echo ""
  echo "Available snapshots:"
  curl -s -u "${ELASTICSEARCH_USER}:${ELASTICSEARCH_PASSWORD}" \
    "${ELASTICSEARCH_URL}/_snapshot/${SNAPSHOT_REPO_NAME}/_all" | \
    jq -r '.snapshots[] | "\(.snapshot) - \(.state) - \(.start_time)"'
  exit 1
fi

echo "========================================="
echo "Elasticsearch Restore Script"
echo "========================================="
echo "Repository: ${SNAPSHOT_REPO_NAME}"
echo "Snapshot: ${SNAPSHOT_NAME}"
echo "Time: $(date)"
echo "========================================="

# Wait for Elasticsearch to be ready
until curl -s -u "${ELASTICSEARCH_USER}:${ELASTICSEARCH_PASSWORD}" "${ELASTICSEARCH_URL}/_cluster/health" | grep -q '"status":"green"\|"status":"yellow"'; do
  echo "Waiting for Elasticsearch to be ready..."
  sleep 5
done

echo "Elasticsearch is ready"

# Verify snapshot exists
echo ""
echo "Verifying snapshot exists..."
SNAPSHOT_EXISTS=$(curl -s -u "${ELASTICSEARCH_USER}:${ELASTICSEARCH_PASSWORD}" \
  "${ELASTICSEARCH_URL}/_snapshot/${SNAPSHOT_REPO_NAME}/${SNAPSHOT_NAME}" | \
  jq -r '.snapshots | length')

if [ "$SNAPSHOT_EXISTS" -eq "0" ]; then
  echo "✗ Snapshot ${SNAPSHOT_NAME} not found!"
  exit 1
fi

echo "✓ Snapshot found"

# Display snapshot info
echo ""
echo "Snapshot information:"
curl -s -u "${ELASTICSEARCH_USER}:${ELASTICSEARCH_PASSWORD}" \
  "${ELASTICSEARCH_URL}/_snapshot/${SNAPSHOT_REPO_NAME}/${SNAPSHOT_NAME}" | jq .

# Confirmation prompt
echo ""
read -p "⚠️  This will restore data from the snapshot. Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Restore cancelled"
  exit 0
fi

# Close indices before restore
echo ""
echo "Closing indices before restore..."
curl -X POST -u "${ELASTICSEARCH_USER}:${ELASTICSEARCH_PASSWORD}" \
  "${ELASTICSEARCH_URL}/logs-*/_close"

# Restore snapshot
echo ""
echo "Starting restore..."
RESTORE_START=$(date +%s)

curl -X POST -u "${ELASTICSEARCH_USER}:${ELASTICSEARCH_PASSWORD}" \
  -H "Content-Type: application/json" \
  "${ELASTICSEARCH_URL}/_snapshot/${SNAPSHOT_REPO_NAME}/${SNAPSHOT_NAME}/_restore?wait_for_completion=false" \
  -d '{
    "indices": "logs-*,kibana*,.kibana*",
    "ignore_unavailable": true,
    "include_global_state": true,
    "rename_pattern": "(.+)",
    "rename_replacement": "$1",
    "include_aliases": true
  }'

echo ""
echo "Restore initiated. Monitoring progress..."

# Monitor restore progress
while true; do
  RECOVERY=$(curl -s -u "${ELASTICSEARCH_USER}:${ELASTICSEARCH_PASSWORD}" \
    "${ELASTICSEARCH_URL}/_recovery" | jq -r 'to_entries | length')

  if [ "$RECOVERY" -eq "0" ]; then
    RESTORE_END=$(date +%s)
    DURATION=$((RESTORE_END - RESTORE_START))
    echo ""
    echo "✓ Restore completed successfully in ${DURATION} seconds"
    break
  else
    echo "Recovery in progress... (${RECOVERY} shards)"
    sleep 10
  fi
done

# Reopen indices
echo ""
echo "Reopening indices..."
curl -X POST -u "${ELASTICSEARCH_USER}:${ELASTICSEARCH_PASSWORD}" \
  "${ELASTICSEARCH_URL}/logs-*/_open"

# Verify cluster health
echo ""
echo "Cluster health after restore:"
curl -s -u "${ELASTICSEARCH_USER}:${ELASTICSEARCH_PASSWORD}" \
  "${ELASTICSEARCH_URL}/_cluster/health?pretty" | jq .

# List restored indices
echo ""
echo "Restored indices:"
curl -s -u "${ELASTICSEARCH_USER}:${ELASTICSEARCH_PASSWORD}" \
  "${ELASTICSEARCH_URL}/_cat/indices/logs-*?v"

echo ""
echo "========================================="
echo "Restore completed successfully!"
echo "========================================="
