#!/bin/bash
# Apply Index Lifecycle Management policies to Elasticsearch

set -e

ELASTICSEARCH_URL="${ELASTICSEARCH_URL:-http://elasticsearch:9200}"
ELASTICSEARCH_USER="${ELASTICSEARCH_USER:-elastic}"
ELASTICSEARCH_PASSWORD="${ELASTICSEARCH_PASSWORD:-changeme}"

echo "Applying ILM policies to Elasticsearch at ${ELASTICSEARCH_URL}"

# Wait for Elasticsearch to be ready
until curl -s -u "${ELASTICSEARCH_USER}:${ELASTICSEARCH_PASSWORD}" "${ELASTICSEARCH_URL}/_cluster/health" | grep -q '"status":"green"\|"status":"yellow"'; do
  echo "Waiting for Elasticsearch to be ready..."
  sleep 5
done

echo "Elasticsearch is ready"

# Apply logs ILM policy
echo "Applying logs-ilm-policy..."
curl -X PUT -u "${ELASTICSEARCH_USER}:${ELASTICSEARCH_PASSWORD}" \
  -H "Content-Type: application/json" \
  "${ELASTICSEARCH_URL}/_ilm/policy/logs-ilm-policy" \
  -d @/elk/index-lifecycle/logs-ilm-policy.json

# Apply audit logs ILM policy
echo "Applying audit-logs-ilm-policy..."
curl -X PUT -u "${ELASTICSEARCH_USER}:${ELASTICSEARCH_PASSWORD}" \
  -H "Content-Type: application/json" \
  "${ELASTICSEARCH_URL}/_ilm/policy/audit-logs-ilm-policy" \
  -d @/elk/index-lifecycle/audit-logs-ilm-policy.json

echo "ILM policies applied successfully"

# Verify policies
echo "Verifying ILM policies..."
curl -s -u "${ELASTICSEARCH_USER}:${ELASTICSEARCH_PASSWORD}" \
  "${ELASTICSEARCH_URL}/_ilm/policy/logs-ilm-policy" | jq .

curl -s -u "${ELASTICSEARCH_USER}:${ELASTICSEARCH_PASSWORD}" \
  "${ELASTICSEARCH_URL}/_ilm/policy/audit-logs-ilm-policy" | jq .

echo "Done!"
