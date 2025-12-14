#!/bin/bash
# Apply Index Templates to Elasticsearch

set -e

ELASTICSEARCH_URL="${ELASTICSEARCH_URL:-http://elasticsearch:9200}"
ELASTICSEARCH_USER="${ELASTICSEARCH_USER:-elastic}"
ELASTICSEARCH_PASSWORD="${ELASTICSEARCH_PASSWORD:-changeme}"

echo "Applying Index Templates to Elasticsearch at ${ELASTICSEARCH_URL}"

# Wait for Elasticsearch to be ready
until curl -s -u "${ELASTICSEARCH_USER}:${ELASTICSEARCH_PASSWORD}" "${ELASTICSEARCH_URL}/_cluster/health" | grep -q '"status":"green"\|"status":"yellow"'; do
  echo "Waiting for Elasticsearch to be ready..."
  sleep 5
done

echo "Elasticsearch is ready"

# Apply application logs template
echo "Applying application-logs template..."
curl -X PUT -u "${ELASTICSEARCH_USER}:${ELASTICSEARCH_PASSWORD}" \
  -H "Content-Type: application/json" \
  "${ELASTICSEARCH_URL}/_index_template/application-logs-template" \
  -d @/elk/index-templates/application-logs-template.json

# Apply access logs template
echo "Applying access-logs template..."
curl -X PUT -u "${ELASTICSEARCH_USER}:${ELASTICSEARCH_PASSWORD}" \
  -H "Content-Type: application/json" \
  "${ELASTICSEARCH_URL}/_index_template/access-logs-template" \
  -d @/elk/index-templates/access-logs-template.json

# Apply audit logs template
echo "Applying audit-logs template..."
curl -X PUT -u "${ELASTICSEARCH_USER}:${ELASTICSEARCH_PASSWORD}" \
  -H "Content-Type: application/json" \
  "${ELASTICSEARCH_URL}/_index_template/audit-logs-template" \
  -d @/elk/index-templates/audit-logs-template.json

echo "Index templates applied successfully"

# Verify templates
echo "Verifying index templates..."
curl -s -u "${ELASTICSEARCH_USER}:${ELASTICSEARCH_PASSWORD}" \
  "${ELASTICSEARCH_URL}/_index_template/application-logs-template" | jq .

curl -s -u "${ELASTICSEARCH_USER}:${ELASTICSEARCH_PASSWORD}" \
  "${ELASTICSEARCH_URL}/_index_template/access-logs-template" | jq .

curl -s -u "${ELASTICSEARCH_USER}:${ELASTICSEARCH_PASSWORD}" \
  "${ELASTICSEARCH_URL}/_index_template/audit-logs-template" | jq .

# Create initial indices with aliases
echo "Creating initial indices..."
curl -X PUT -u "${ELASTICSEARCH_USER}:${ELASTICSEARCH_PASSWORD}" \
  -H "Content-Type: application/json" \
  "${ELASTICSEARCH_URL}/logs-api-000001" \
  -d '{
    "aliases": {
      "logs-api": {
        "is_write_index": true
      }
    }
  }'

curl -X PUT -u "${ELASTICSEARCH_USER}:${ELASTICSEARCH_PASSWORD}" \
  -H "Content-Type: application/json" \
  "${ELASTICSEARCH_URL}/logs-nginx-000001" \
  -d '{
    "aliases": {
      "logs-nginx": {
        "is_write_index": true
      }
    }
  }'

curl -X PUT -u "${ELASTICSEARCH_USER}:${ELASTICSEARCH_PASSWORD}" \
  -H "Content-Type: application/json" \
  "${ELASTICSEARCH_URL}/logs-audit-000001" \
  -d '{
    "aliases": {
      "logs-audit": {
        "is_write_index": true
      }
    }
  }'

echo "Done!"
