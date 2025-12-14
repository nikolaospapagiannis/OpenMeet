#!/bin/bash
# Setup Elasticsearch snapshot repository for backups

set -e

ELASTICSEARCH_URL="${ELASTICSEARCH_URL:-http://elasticsearch:9200}"
ELASTICSEARCH_USER="${ELASTICSEARCH_USER:-elastic}"
ELASTICSEARCH_PASSWORD="${ELASTICSEARCH_PASSWORD:-changeme}"
SNAPSHOT_REPO_NAME="${SNAPSHOT_REPO_NAME:-elk_backups}"
SNAPSHOT_LOCATION="${SNAPSHOT_LOCATION:-/usr/share/elasticsearch/snapshots}"

# For S3 snapshots
S3_BUCKET="${S3_BUCKET:-}"
S3_REGION="${S3_REGION:-us-east-1}"
AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-}"
AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-}"

echo "Setting up Elasticsearch snapshot repository..."

# Wait for Elasticsearch to be ready
until curl -s -u "${ELASTICSEARCH_USER}:${ELASTICSEARCH_PASSWORD}" "${ELASTICSEARCH_URL}/_cluster/health" | grep -q '"status":"green"\|"status":"yellow"'; do
  echo "Waiting for Elasticsearch to be ready..."
  sleep 5
done

echo "Elasticsearch is ready"

# Check if using S3 or filesystem
if [ -n "$S3_BUCKET" ]; then
  echo "Setting up S3 snapshot repository: s3://${S3_BUCKET}"

  # Register S3 repository
  curl -X PUT -u "${ELASTICSEARCH_USER}:${ELASTICSEARCH_PASSWORD}" \
    -H "Content-Type: application/json" \
    "${ELASTICSEARCH_URL}/_snapshot/${SNAPSHOT_REPO_NAME}" \
    -d "{
      \"type\": \"s3\",
      \"settings\": {
        \"bucket\": \"${S3_BUCKET}\",
        \"region\": \"${S3_REGION}\",
        \"base_path\": \"elasticsearch-snapshots\",
        \"compress\": true,
        \"max_restore_bytes_per_sec\": \"100mb\",
        \"max_snapshot_bytes_per_sec\": \"100mb\"
      }
    }"
else
  echo "Setting up filesystem snapshot repository: ${SNAPSHOT_LOCATION}"

  # Register filesystem repository
  curl -X PUT -u "${ELASTICSEARCH_USER}:${ELASTICSEARCH_PASSWORD}" \
    -H "Content-Type: application/json" \
    "${ELASTICSEARCH_URL}/_snapshot/${SNAPSHOT_REPO_NAME}" \
    -d "{
      \"type\": \"fs\",
      \"settings\": {
        \"location\": \"${SNAPSHOT_LOCATION}\",
        \"compress\": true,
        \"max_restore_bytes_per_sec\": \"100mb\",
        \"max_snapshot_bytes_per_sec\": \"100mb\"
      }
    }"
fi

echo ""
echo "Snapshot repository created successfully!"

# Verify repository
echo "Verifying snapshot repository..."
curl -s -u "${ELASTICSEARCH_USER}:${ELASTICSEARCH_PASSWORD}" \
  "${ELASTICSEARCH_URL}/_snapshot/${SNAPSHOT_REPO_NAME}" | jq .

echo ""
echo "Repository verification:"
curl -s -u "${ELASTICSEARCH_USER}:${ELASTICSEARCH_PASSWORD}" \
  "${ELASTICSEARCH_URL}/_snapshot/${SNAPSHOT_REPO_NAME}/_verify" | jq .

echo ""
echo "Done!"
