#!/bin/bash
# ELK Stack Verification Script

set -e

NAMESPACE="${NAMESPACE:-production}"
ELASTICSEARCH_URL="${ELASTICSEARCH_URL:-http://elasticsearch:9200}"
ELASTICSEARCH_USER="${ELASTICSEARCH_USER:-elastic}"
ELASTICSEARCH_PASSWORD="${ELASTICSEARCH_PASSWORD:-changeme}"

echo "========================================="
echo "ELK Stack Verification"
echo "========================================="
echo "Namespace: ${NAMESPACE}"
echo "Time: $(date)"
echo "========================================="

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check function
check() {
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} $1"
  else
    echo -e "${RED}✗${NC} $1"
  fi
}

# 1. Check Kubernetes Resources
echo ""
echo "1. Checking Kubernetes Resources..."
echo "-----------------------------------"

echo -n "Elasticsearch StatefulSet: "
kubectl get statefulset elasticsearch -n ${NAMESPACE} &>/dev/null
check "Elasticsearch StatefulSet exists"

echo -n "Logstash Deployment: "
kubectl get deployment logstash -n ${NAMESPACE} &>/dev/null
check "Logstash Deployment exists"

echo -n "Kibana Deployment: "
kubectl get deployment kibana -n ${NAMESPACE} &>/dev/null
check "Kibana Deployment exists"

echo -n "Filebeat DaemonSet: "
kubectl get daemonset filebeat -n ${NAMESPACE} &>/dev/null
check "Filebeat DaemonSet exists"

# 2. Check Pod Status
echo ""
echo "2. Checking Pod Status..."
echo "-------------------------"

ES_PODS=$(kubectl get pods -n ${NAMESPACE} -l app=elasticsearch --no-headers 2>/dev/null | wc -l)
ES_READY=$(kubectl get pods -n ${NAMESPACE} -l app=elasticsearch --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l)
echo "Elasticsearch Pods: ${ES_READY}/${ES_PODS} running"
[ ${ES_READY} -gt 0 ] && check "Elasticsearch pods running" || echo -e "${RED}✗${NC} Elasticsearch pods not running"

LS_PODS=$(kubectl get pods -n ${NAMESPACE} -l app=logstash --no-headers 2>/dev/null | wc -l)
LS_READY=$(kubectl get pods -n ${NAMESPACE} -l app=logstash --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l)
echo "Logstash Pods: ${LS_READY}/${LS_PODS} running"
[ ${LS_READY} -gt 0 ] && check "Logstash pods running" || echo -e "${RED}✗${NC} Logstash pods not running"

KB_PODS=$(kubectl get pods -n ${NAMESPACE} -l app=kibana --no-headers 2>/dev/null | wc -l)
KB_READY=$(kubectl get pods -n ${NAMESPACE} -l app=kibana --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l)
echo "Kibana Pods: ${KB_READY}/${KB_PODS} running"
[ ${KB_READY} -gt 0 ] && check "Kibana pods running" || echo -e "${RED}✗${NC} Kibana pods not running"

FB_PODS=$(kubectl get pods -n ${NAMESPACE} -l app=filebeat --no-headers 2>/dev/null | wc -l)
FB_READY=$(kubectl get pods -n ${NAMESPACE} -l app=filebeat --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l)
echo "Filebeat Pods: ${FB_READY}/${FB_PODS} running"
[ ${FB_READY} -gt 0 ] && check "Filebeat pods running" || echo -e "${RED}✗${NC} Filebeat pods not running"

# 3. Check Elasticsearch Cluster Health
echo ""
echo "3. Checking Elasticsearch Cluster Health..."
echo "-------------------------------------------"

if [ ${ES_READY} -gt 0 ]; then
  ES_POD=$(kubectl get pods -n ${NAMESPACE} -l app=elasticsearch --field-selector=status.phase=Running --no-headers -o custom-columns=":metadata.name" | head -1)

  CLUSTER_HEALTH=$(kubectl exec -n ${NAMESPACE} ${ES_POD} -- \
    curl -s -u ${ELASTICSEARCH_USER}:${ELASTICSEARCH_PASSWORD} \
    http://localhost:9200/_cluster/health 2>/dev/null)

  if [ $? -eq 0 ]; then
    STATUS=$(echo $CLUSTER_HEALTH | jq -r '.status')
    NODES=$(echo $CLUSTER_HEALTH | jq -r '.number_of_nodes')
    INDICES=$(echo $CLUSTER_HEALTH | jq -r '.active_primary_shards')

    echo "Cluster Status: ${STATUS}"
    echo "Number of Nodes: ${NODES}"
    echo "Active Indices: ${INDICES}"

    if [ "$STATUS" == "green" ] || [ "$STATUS" == "yellow" ]; then
      check "Cluster health is ${STATUS}"
    else
      echo -e "${RED}✗${NC} Cluster health is ${STATUS}"
    fi
  else
    echo -e "${RED}✗${NC} Could not connect to Elasticsearch"
  fi
else
  echo -e "${YELLOW}⚠${NC} Elasticsearch pods not running, skipping health check"
fi

# 4. Check Indices
echo ""
echo "4. Checking Indices..."
echo "----------------------"

if [ ${ES_READY} -gt 0 ]; then
  INDICES=$(kubectl exec -n ${NAMESPACE} ${ES_POD} -- \
    curl -s -u ${ELASTICSEARCH_USER}:${ELASTICSEARCH_PASSWORD} \
    "http://localhost:9200/_cat/indices/logs-*?h=index" 2>/dev/null)

  if [ -n "$INDICES" ]; then
    echo "Found indices:"
    echo "$INDICES"
    check "Log indices exist"
  else
    echo -e "${YELLOW}⚠${NC} No log indices found yet"
  fi
fi

# 5. Check ILM Policies
echo ""
echo "5. Checking ILM Policies..."
echo "---------------------------"

if [ ${ES_READY} -gt 0 ]; then
  ILM=$(kubectl exec -n ${NAMESPACE} ${ES_POD} -- \
    curl -s -u ${ELASTICSEARCH_USER}:${ELASTICSEARCH_PASSWORD} \
    "http://localhost:9200/_ilm/policy" 2>/dev/null)

  LOGS_ILM=$(echo $ILM | jq -r '.["logs-ilm-policy"]' 2>/dev/null)
  AUDIT_ILM=$(echo $ILM | jq -r '.["audit-logs-ilm-policy"]' 2>/dev/null)

  if [ "$LOGS_ILM" != "null" ] && [ -n "$LOGS_ILM" ]; then
    check "logs-ilm-policy exists"
  else
    echo -e "${YELLOW}⚠${NC} logs-ilm-policy not found (run apply-ilm-policies.sh)"
  fi

  if [ "$AUDIT_ILM" != "null" ] && [ -n "$AUDIT_ILM" ]; then
    check "audit-logs-ilm-policy exists"
  else
    echo -e "${YELLOW}⚠${NC} audit-logs-ilm-policy not found (run apply-ilm-policies.sh)"
  fi
fi

# 6. Check Services
echo ""
echo "6. Checking Services..."
echo "-----------------------"

kubectl get svc elasticsearch -n ${NAMESPACE} &>/dev/null
check "Elasticsearch service exists"

kubectl get svc logstash -n ${NAMESPACE} &>/dev/null
check "Logstash service exists"

kubectl get svc kibana -n ${NAMESPACE} &>/dev/null
check "Kibana service exists"

# 7. Check Ingress
echo ""
echo "7. Checking Ingress..."
echo "----------------------"

kubectl get ingress kibana -n ${NAMESPACE} &>/dev/null
if [ $? -eq 0 ]; then
  KIBANA_HOST=$(kubectl get ingress kibana -n ${NAMESPACE} -o jsonpath='{.spec.rules[0].host}')
  echo "Kibana URL: https://${KIBANA_HOST}"
  check "Kibana ingress configured"
else
  echo -e "${YELLOW}⚠${NC} Kibana ingress not found"
fi

# 8. Check Log Ingestion Rate
echo ""
echo "8. Checking Log Ingestion..."
echo "-----------------------------"

if [ ${ES_READY} -gt 0 ]; then
  # Count documents in last 5 minutes
  DOCS_COUNT=$(kubectl exec -n ${NAMESPACE} ${ES_POD} -- \
    curl -s -u ${ELASTICSEARCH_USER}:${ELASTICSEARCH_PASSWORD} \
    -X GET "http://localhost:9200/logs-*/_count?q=@timestamp:[now-5m TO now]" 2>/dev/null | \
    jq -r '.count' 2>/dev/null)

  if [ -n "$DOCS_COUNT" ] && [ "$DOCS_COUNT" != "null" ]; then
    echo "Documents indexed (last 5 min): ${DOCS_COUNT}"
    if [ "$DOCS_COUNT" -gt 0 ]; then
      RATE=$((DOCS_COUNT / 5))
      echo "Ingestion rate: ~${RATE} docs/min"
      check "Logs are being ingested"
    else
      echo -e "${YELLOW}⚠${NC} No logs ingested in last 5 minutes"
    fi
  else
    echo -e "${YELLOW}⚠${NC} Could not query document count"
  fi
fi

# 9. Check Snapshot Repository
echo ""
echo "9. Checking Snapshot Repository..."
echo "-----------------------------------"

if [ ${ES_READY} -gt 0 ]; then
  REPO=$(kubectl exec -n ${NAMESPACE} ${ES_POD} -- \
    curl -s -u ${ELASTICSEARCH_USER}:${ELASTICSEARCH_PASSWORD} \
    "http://localhost:9200/_snapshot" 2>/dev/null | \
    jq -r 'keys[]' 2>/dev/null | head -1)

  if [ -n "$REPO" ] && [ "$REPO" != "null" ]; then
    echo "Snapshot repository: ${REPO}"
    check "Snapshot repository configured"
  else
    echo -e "${YELLOW}⚠${NC} Snapshot repository not configured (run setup-snapshot-repository.sh)"
  fi
fi

# 10. Summary
echo ""
echo "========================================="
echo "Summary"
echo "========================================="
echo "ELK Stack Status:"
echo "  - Elasticsearch: ${ES_READY}/${ES_PODS} pods"
echo "  - Logstash: ${LS_READY}/${LS_PODS} pods"
echo "  - Kibana: ${KB_READY}/${KB_PODS} pods"
echo "  - Filebeat: ${FB_READY}/${FB_PODS} pods"
echo ""

if [ ${ES_READY} -gt 0 ] && [ ${LS_READY} -gt 0 ] && [ ${KB_READY} -gt 0 ] && [ ${FB_READY} -gt 0 ]; then
  echo -e "${GREEN}✓${NC} ELK Stack is running!"
  echo ""
  echo "Next Steps:"
  echo "  1. Access Kibana: https://${KIBANA_HOST:-kibana.openmeet.com}"
  echo "  2. Import dashboards from: /home/user/openmeet/infrastructure/elk/kibana/dashboards/"
  echo "  3. Configure alerting rules"
  echo "  4. Setup backup schedule"
  exit 0
else
  echo -e "${YELLOW}⚠${NC} Some components are not running properly"
  echo ""
  echo "Troubleshooting:"
  echo "  kubectl logs -n ${NAMESPACE} <pod-name>"
  echo "  kubectl describe pod -n ${NAMESPACE} <pod-name>"
  exit 1
fi
