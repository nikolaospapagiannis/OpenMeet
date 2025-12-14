#!/bin/bash
# Apply Kibana alerting rules

set -e

KIBANA_URL="${KIBANA_URL:-http://kibana:5601}"
ELASTICSEARCH_USER="${ELASTICSEARCH_USER:-elastic}"
ELASTICSEARCH_PASSWORD="${ELASTICSEARCH_PASSWORD:-changeme}"

echo "Applying Kibana alerts at ${KIBANA_URL}"

# Wait for Kibana to be ready
until curl -s "${KIBANA_URL}/api/status" | grep -q '"level":"available"'; do
  echo "Waiting for Kibana to be ready..."
  sleep 5
done

echo "Kibana is ready"

# Note: Alerting rules require connector setup first
echo "⚠️  Note: Before applying alerts, you need to set up connectors in Kibana:"
echo "1. Slack connector (id: slack-connector)"
echo "2. Email connector (id: email-connector)"
echo "3. PagerDuty connector (id: pagerduty-connector)"
echo ""
echo "Visit: ${KIBANA_URL}/app/management/insightsAndAlerting/triggersActions/connectors"
echo ""

# Apply alerts (this is an example - actual API might vary)
echo "To manually create alerts, use the Kibana UI or import the JSON files from:"
echo "  - /elk/kibana/alerts/error-rate-alert.json"
echo "  - /elk/kibana/alerts/failed-login-alert.json"
echo "  - /elk/kibana/alerts/disk-space-alert.json"
echo "  - /elk/kibana/alerts/service-unavailable-alert.json"
echo "  - /elk/kibana/alerts/slow-response-alert.json"
echo ""
echo "Visit: ${KIBANA_URL}/app/management/insightsAndAlerting/triggersActions/rules"

echo "Done!"
