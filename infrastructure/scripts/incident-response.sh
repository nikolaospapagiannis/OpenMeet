#!/bin/bash

###############################################################################
# Automated Incident Response System
# Detects incidents, alerts on-call team, and executes runbooks automatically
###############################################################################

set -euo pipefail

INCIDENT_ID="INC-$(date +%Y%m%d_%H%M%S)"
INCIDENT_LOG="/var/log/incidents/${INCIDENT_ID}.log"
RUNBOOK_DIR="/home/user/openmeet-v2/infrastructure/runbooks"

# PagerDuty/Opsgenie configuration
PAGERDUTY_API_KEY="${PAGERDUTY_API_KEY:-}"
PAGERDUTY_SERVICE_ID="${PAGERDUTY_SERVICE_ID:-}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$INCIDENT_LOG"
}

# Create incident log directory
mkdir -p /var/log/incidents

log "=========================================="
log "Incident Response Activated"
log "Incident ID: $INCIDENT_ID"
log "=========================================="

# Detect incident type
detect_incident() {
    local incident_type=""

    # Check database health
    if ! kubectl exec -n openmeet-production postgres-patroni-0 -- pg_isready -U postgres &>/dev/null; then
        incident_type="database-failure"
        log "Detected: DATABASE FAILURE"
    fi

    # Check API health
    if ! curl -f -s -o /dev/null http://api.openmeet.ai/health 2>/dev/null; then
        incident_type="api-outage"
        log "Detected: API OUTAGE"
    fi

    # Check storage
    DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$DISK_USAGE" -gt 85 ]; then
        incident_type="storage-failure"
        log "Detected: STORAGE CRITICAL (${DISK_USAGE}% full)"
    fi

    # Check pod failures
    FAILED_PODS=$(kubectl get pods -n openmeet-production --field-selector=status.phase!=Running --no-headers 2>/dev/null | wc -l)
    if [ "$FAILED_PODS" -gt 3 ]; then
        incident_type="pod-failures"
        log "Detected: MULTIPLE POD FAILURES ($FAILED_PODS pods)"
    fi

    echo "$incident_type"
}

# Alert on-call team
alert_oncall() {
    local incident_type="$1"
    local severity="${2:-high}"

    log "Alerting on-call team..."

    # PagerDuty integration
    if [ -n "$PAGERDUTY_API_KEY" ] && [ -n "$PAGERDUTY_SERVICE_ID" ]; then
        curl -X POST "https://api.pagerduty.com/incidents" \
            -H "Authorization: Token token=$PAGERDUTY_API_KEY" \
            -H "Content-Type: application/json" \
            -H "Accept: application/vnd.pagerduty+json;version=2" \
            -d "{
                \"incident\": {
                    \"type\": \"incident\",
                    \"title\": \"$incident_type detected\",
                    \"service\": {
                        \"id\": \"$PAGERDUTY_SERVICE_ID\",
                        \"type\": \"service_reference\"
                    },
                    \"urgency\": \"$severity\",
                    \"body\": {
                        \"type\": \"incident_body\",
                        \"details\": \"Incident ID: $INCIDENT_ID - Automated response initiated\"
                    }
                }
            }" || log "WARNING: PagerDuty alert failed"
    fi

    # Slack integration
    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -X POST "$SLACK_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d "{
                \"text\": \"🚨 INCIDENT DETECTED: $incident_type\",
                \"attachments\": [{
                    \"color\": \"danger\",
                    \"fields\": [
                        {\"title\": \"Incident ID\", \"value\": \"$INCIDENT_ID\", \"short\": true},
                        {\"title\": \"Severity\", \"value\": \"$severity\", \"short\": true},
                        {\"title\": \"Status\", \"value\": \"Automated response initiated\", \"short\": false}
                    ]
                }]
            }" || log "WARNING: Slack alert failed"
    fi

    log "On-call team alerted"
}

# Execute runbook
execute_runbook() {
    local incident_type="$1"
    local runbook_file="$RUNBOOK_DIR/${incident_type}.md"

    log "Executing runbook for: $incident_type"

    if [ ! -f "$runbook_file" ]; then
        log "ERROR: Runbook not found: $runbook_file"
        return 1
    fi

    # Extract automation steps from runbook
    # Runbooks have special sections for automated steps
    case "$incident_type" in
        database-failure)
            log "Executing database failure runbook..."

            # Check Patroni cluster status
            kubectl exec -n openmeet-production postgres-patroni-0 -- patronictl list || true

            # Attempt automatic failover if needed
            log "Checking if failover is needed..."
            if ! kubectl exec -n openmeet-production postgres-patroni-0 -- pg_isready -U postgres &>/dev/null; then
                log "Primary is down, triggering failover..."
                kubectl exec -n openmeet-production postgres-patroni-1 -- patronictl failover --candidate postgres-patroni-1 --force
                sleep 30
            fi

            # Verify cluster health
            CLUSTER_HEALTH=$(kubectl exec -n openmeet-production postgres-patroni-0 -- patronictl list | grep -c "running" || echo "0")
            log "Cluster health: $CLUSTER_HEALTH nodes running"
            ;;

        api-outage)
            log "Executing API outage runbook..."

            # Check API pod status
            kubectl get pods -n openmeet-production -l app=api

            # Restart failed API pods
            FAILED_API_PODS=$(kubectl get pods -n openmeet-production -l app=api --field-selector=status.phase!=Running -o name 2>/dev/null || echo "")
            if [ -n "$FAILED_API_PODS" ]; then
                log "Restarting failed API pods..."
                echo "$FAILED_API_PODS" | xargs -r kubectl delete -n openmeet-production
                sleep 30
            fi

            # Scale up API if needed
            CURRENT_REPLICAS=$(kubectl get deployment api -n openmeet-production -o jsonpath='{.spec.replicas}')
            if [ "$CURRENT_REPLICAS" -lt 3 ]; then
                log "Scaling API to 3 replicas..."
                kubectl scale deployment api -n openmeet-production --replicas=3
            fi
            ;;

        storage-failure)
            log "Executing storage failure runbook..."

            # Clean up old logs
            log "Cleaning up old logs..."
            find /var/log -name "*.log" -mtime +7 -delete 2>/dev/null || true

            # Clean up Docker images
            log "Cleaning up Docker images..."
            docker system prune -af --volumes 2>/dev/null || log "Docker cleanup skipped"

            # Check PVC usage
            kubectl get pvc -n openmeet-production

            # Alert if critical
            DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
            if [ "$DISK_USAGE" -gt 90 ]; then
                log "CRITICAL: Disk usage at ${DISK_USAGE}%"
                alert_oncall "storage-critical" "critical"
            fi
            ;;

        pod-failures)
            log "Executing pod failure runbook..."

            # List failed pods
            kubectl get pods -n openmeet-production --field-selector=status.phase!=Running

            # Get pod events
            kubectl get events -n openmeet-production --sort-by='.lastTimestamp' | tail -20

            # Restart failed pods
            log "Restarting failed pods..."
            kubectl delete pods -n openmeet-production --field-selector=status.phase!=Running --force --grace-period=0 2>/dev/null || true

            # Check for node issues
            kubectl get nodes
            kubectl describe nodes | grep -A 5 "Conditions:"
            ;;

        *)
            log "No specific runbook for: $incident_type"
            log "Executing generic recovery steps..."

            # Generic recovery: restart unhealthy pods
            kubectl delete pods -n openmeet-production --field-selector=status.phase!=Running --force --grace-period=0 2>/dev/null || true
            ;;
    esac

    log "Runbook execution completed"
}

# Verify recovery
verify_recovery() {
    log "Verifying system recovery..."

    sleep 30

    # Check database
    if kubectl exec -n openmeet-production postgres-patroni-0 -- pg_isready -U postgres &>/dev/null; then
        log "✅ Database: HEALTHY"
        DB_STATUS="healthy"
    else
        log "❌ Database: UNHEALTHY"
        DB_STATUS="unhealthy"
    fi

    # Check API
    if curl -f -s -o /dev/null http://api.openmeet.ai/health 2>/dev/null; then
        log "✅ API: HEALTHY"
        API_STATUS="healthy"
    else
        log "❌ API: UNHEALTHY"
        API_STATUS="unhealthy"
    fi

    # Check pods
    FAILED_PODS=$(kubectl get pods -n openmeet-production --field-selector=status.phase!=Running --no-headers 2>/dev/null | wc -l)
    if [ "$FAILED_PODS" -eq 0 ]; then
        log "✅ Pods: ALL RUNNING"
        POD_STATUS="healthy"
    else
        log "⚠️  Pods: $FAILED_PODS FAILED"
        POD_STATUS="unhealthy"
    fi

    # Overall status
    if [ "$DB_STATUS" == "healthy" ] && [ "$API_STATUS" == "healthy" ] && [ "$POD_STATUS" == "healthy" ]; then
        log "✅ RECOVERY SUCCESSFUL"
        RECOVERY_STATUS="success"
    else
        log "❌ RECOVERY INCOMPLETE"
        RECOVERY_STATUS="failed"
    fi

    echo "$RECOVERY_STATUS"
}

# Generate incident report
generate_report() {
    local incident_type="$1"
    local recovery_status="$2"

    log "Generating incident report..."

    cat > "/var/log/incidents/${INCIDENT_ID}_report.json" <<EOF
{
  "incident_id": "$INCIDENT_ID",
  "timestamp": "$(date -Iseconds)",
  "incident_type": "$incident_type",
  "recovery_status": "$recovery_status",
  "timeline": {
    "detected": "$(date -Iseconds)",
    "alert_sent": "$(date -Iseconds)",
    "runbook_executed": "$(date -Iseconds)",
    "recovery_verified": "$(date -Iseconds)"
  },
  "actions_taken": [
    "Detected $incident_type",
    "Alerted on-call team",
    "Executed automated runbook",
    "Verified system recovery"
  ],
  "system_status": {
    "database": "$DB_STATUS",
    "api": "$API_STATUS",
    "pods": "$POD_STATUS"
  }
}
EOF

    # Upload to S3
    if command -v aws &> /dev/null && [ -n "${S3_BUCKET:-}" ]; then
        aws s3 cp "/var/log/incidents/${INCIDENT_ID}_report.json" \
            "s3://${S3_BUCKET}/incidents/${INCIDENT_ID}_report.json" \
            --region "${S3_REGION:-us-east-1}" 2>/dev/null || log "WARNING: Could not upload to S3"
    fi

    log "Incident report generated: /var/log/incidents/${INCIDENT_ID}_report.json"
}

# Main incident response flow
main() {
    # Detect incident
    INCIDENT_TYPE=$(detect_incident)

    if [ -z "$INCIDENT_TYPE" ]; then
        log "No incidents detected"
        exit 0
    fi

    # Alert on-call team
    alert_oncall "$INCIDENT_TYPE" "high"

    # Execute appropriate runbook
    execute_runbook "$INCIDENT_TYPE"

    # Verify recovery
    RECOVERY_STATUS=$(verify_recovery)

    # Generate report
    generate_report "$INCIDENT_TYPE" "$RECOVERY_STATUS"

    # Update status
    if [ -n "$SLACK_WEBHOOK" ]; then
        STATUS_EMOJI="✅"
        [ "$RECOVERY_STATUS" != "success" ] && STATUS_EMOJI="⚠️"

        curl -X POST "$SLACK_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d "{\"text\": \"$STATUS_EMOJI Incident $INCIDENT_ID: Recovery $(echo $RECOVERY_STATUS | tr '[:lower:]' '[:upper:]')\"}" 2>/dev/null || true
    fi

    log "=========================================="
    log "Incident response completed"
    log "Incident ID: $INCIDENT_ID"
    log "Status: $RECOVERY_STATUS"
    log "=========================================="

    # Exit with error if recovery failed
    [ "$RECOVERY_STATUS" != "success" ] && exit 1

    exit 0
}

# Run main incident response
main "$@"
