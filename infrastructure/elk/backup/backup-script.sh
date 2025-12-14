#!/bin/bash
# Automated Elasticsearch backup script

set -e

ELASTICSEARCH_URL="${ELASTICSEARCH_URL:-http://elasticsearch:9200}"
ELASTICSEARCH_USER="${ELASTICSEARCH_USER:-elastic}"
ELASTICSEARCH_PASSWORD="${ELASTICSEARCH_PASSWORD:-changeme}"
SNAPSHOT_REPO_NAME="${SNAPSHOT_REPO_NAME:-elk_backups}"
SNAPSHOT_NAME="snapshot-$(date +%Y%m%d-%H%M%S)"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

echo "========================================="
echo "Elasticsearch Backup Script"
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

# Get cluster health
echo ""
echo "Cluster health before backup:"
curl -s -u "${ELASTICSEARCH_USER}:${ELASTICSEARCH_PASSWORD}" \
  "${ELASTICSEARCH_URL}/_cluster/health?pretty" | jq .

# Create snapshot
echo ""
echo "Creating snapshot: ${SNAPSHOT_NAME}"
SNAPSHOT_START=$(date +%s)

curl -X PUT -u "${ELASTICSEARCH_USER}:${ELASTICSEARCH_PASSWORD}" \
  -H "Content-Type: application/json" \
  "${ELASTICSEARCH_URL}/_snapshot/${SNAPSHOT_REPO_NAME}/${SNAPSHOT_NAME}?wait_for_completion=false" \
  -d '{
    "indices": "logs-*,kibana*,.kibana*",
    "ignore_unavailable": true,
    "include_global_state": true,
    "metadata": {
      "taken_by": "automated-backup",
      "taken_at": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'"
    }
  }'

echo ""
echo "Snapshot creation initiated. Monitoring progress..."

# Monitor snapshot progress
while true; do
  STATUS=$(curl -s -u "${ELASTICSEARCH_USER}:${ELASTICSEARCH_PASSWORD}" \
    "${ELASTICSEARCH_URL}/_snapshot/${SNAPSHOT_REPO_NAME}/${SNAPSHOT_NAME}" | \
    jq -r '.snapshots[0].state')

  if [ "$STATUS" == "SUCCESS" ]; then
    SNAPSHOT_END=$(date +%s)
    DURATION=$((SNAPSHOT_END - SNAPSHOT_START))
    echo ""
    echo "✓ Snapshot completed successfully in ${DURATION} seconds"
    break
  elif [ "$STATUS" == "FAILED" ]; then
    echo ""
    echo "✗ Snapshot failed!"
    curl -s -u "${ELASTICSEARCH_USER}:${ELASTICSEARCH_PASSWORD}" \
      "${ELASTICSEARCH_URL}/_snapshot/${SNAPSHOT_REPO_NAME}/${SNAPSHOT_NAME}" | jq .
    exit 1
  elif [ "$STATUS" == "IN_PROGRESS" ]; then
    PROGRESS=$(curl -s -u "${ELASTICSEARCH_USER}:${ELASTICSEARCH_PASSWORD}" \
      "${ELASTICSEARCH_URL}/_snapshot/${SNAPSHOT_REPO_NAME}/${SNAPSHOT_NAME}" | \
      jq -r '.snapshots[0].stats')
    echo "Progress: ${PROGRESS}"
    sleep 10
  else
    echo "Status: ${STATUS}"
    sleep 5
  fi
done

# Get snapshot details
echo ""
echo "Snapshot details:"
curl -s -u "${ELASTICSEARCH_USER}:${ELASTICSEARCH_PASSWORD}" \
  "${ELASTICSEARCH_URL}/_snapshot/${SNAPSHOT_REPO_NAME}/${SNAPSHOT_NAME}" | jq .

# Clean up old snapshots
echo ""
echo "Cleaning up snapshots older than ${RETENTION_DAYS} days..."

CUTOFF_DATE=$(date -d "${RETENTION_DAYS} days ago" +%Y%m%d)

SNAPSHOTS=$(curl -s -u "${ELASTICSEARCH_USER}:${ELASTICSEARCH_PASSWORD}" \
  "${ELASTICSEARCH_URL}/_snapshot/${SNAPSHOT_REPO_NAME}/_all" | \
  jq -r '.snapshots[].snapshot')

for snapshot in $SNAPSHOTS; do
  # Extract date from snapshot name (format: snapshot-YYYYMMDD-HHMMSS)
  SNAP_DATE=$(echo "$snapshot" | grep -oP '\d{8}' | head -1)

  if [ -n "$SNAP_DATE" ] && [ "$SNAP_DATE" -lt "$CUTOFF_DATE" ]; then
    echo "Deleting old snapshot: $snapshot (${SNAP_DATE})"
    curl -X DELETE -u "${ELASTICSEARCH_USER}:${ELASTICSEARCH_PASSWORD}" \
      "${ELASTICSEARCH_URL}/_snapshot/${SNAPSHOT_REPO_NAME}/${snapshot}"
  fi
done

# List all remaining snapshots
echo ""
echo "Current snapshots:"
curl -s -u "${ELASTICSEARCH_USER}:${ELASTICSEARCH_PASSWORD}" \
  "${ELASTICSEARCH_URL}/_snapshot/${SNAPSHOT_REPO_NAME}/_all" | \
  jq -r '.snapshots[] | "\(.snapshot) - \(.state) - \(.start_time)"'

echo ""
echo "========================================="
echo "Backup completed successfully!"
echo "========================================="
