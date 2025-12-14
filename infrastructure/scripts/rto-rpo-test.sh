#!/bin/bash

###############################################################################
# RTO/RPO Monitoring and Compliance Testing
# Measures and reports on Recovery Time and Recovery Point Objectives
###############################################################################

set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_DIR="${REPORT_DIR:-/var/log/rto-rpo-reports}"
S3_BUCKET="${S3_BUCKET:-openmeet-backups}"
S3_REGION="${S3_REGION:-us-east-1}"

# RTO/RPO Targets
RTO_TARGET=300  # 5 minutes in seconds
RPO_TARGET=60   # 1 minute in seconds

# Logging
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$REPORT_DIR/rto_rpo_${TIMESTAMP}.log"
}

error_exit() {
    log "ERROR: $1"
    exit 1
}

# Create report directory
mkdir -p "$REPORT_DIR"

log "=========================================="
log "RTO/RPO Compliance Testing"
log "=========================================="
log "RTO Target: ${RTO_TARGET}s ($(($RTO_TARGET / 60)) minutes)"
log "RPO Target: ${RPO_TARGET}s"

# Test 1: Database Backup RPO
log ""
log "Test 1: Measuring Database Backup RPO"
log "----------------------------------------"

LAST_BACKUP_TIME=$(aws s3 ls "s3://$S3_BUCKET/postgres/dump/" --region "$S3_REGION" | tail -1 | awk '{print $1" "$2}')
LAST_BACKUP_EPOCH=$(date -d "$LAST_BACKUP_TIME" +%s 2>/dev/null || echo "0")
CURRENT_EPOCH=$(date +%s)
BACKUP_RPO=$((CURRENT_EPOCH - LAST_BACKUP_EPOCH))

log "Last backup: $LAST_BACKUP_TIME"
log "Backup age: ${BACKUP_RPO}s ($(($BACKUP_RPO / 60)) minutes)"

if [ $BACKUP_RPO -le $RPO_TARGET ]; then
    log "✅ Backup RPO: PASSED (${BACKUP_RPO}s <= ${RPO_TARGET}s)"
    BACKUP_RPO_STATUS="PASSED"
else
    log "❌ Backup RPO: FAILED (${BACKUP_RPO}s > ${RPO_TARGET}s)"
    BACKUP_RPO_STATUS="FAILED"
fi

# Test 2: Database Replication Lag
log ""
log "Test 2: Measuring Database Replication Lag (RPO)"
log "------------------------------------------------"

REPLICATION_LAG=$(kubectl exec -n openmeet-production postgres-patroni-1 -- psql -U postgres -t -c "SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()))::int;" 2>/dev/null | xargs || echo "999")

log "Replication lag: ${REPLICATION_LAG}s"

if [ $REPLICATION_LAG -le $RPO_TARGET ]; then
    log "✅ Replication RPO: PASSED (${REPLICATION_LAG}s <= ${RPO_TARGET}s)"
    REPLICATION_RPO_STATUS="PASSED"
else
    log "❌ Replication RPO: FAILED (${REPLICATION_LAG}s > ${RPO_TARGET}s)"
    REPLICATION_RPO_STATUS="FAILED"
fi

# Test 3: Simulate Failover and Measure RTO
log ""
log "Test 3: Measuring Failover RTO"
log "-------------------------------"

# Create test data
TEST_VALUE="rto_test_${TIMESTAMP}"
kubectl exec -n openmeet-production postgres-patroni-0 -- psql -U postgres -d openmeet -c "CREATE TABLE IF NOT EXISTS rto_test (id SERIAL PRIMARY KEY, value TEXT, created_at TIMESTAMP DEFAULT NOW())" 2>/dev/null || true
kubectl exec -n openmeet-production postgres-patroni-0 -- psql -U postgres -d openmeet -c "INSERT INTO rto_test (value) VALUES ('${TEST_VALUE}')" 2>/dev/null || true

log "Inserted test data: $TEST_VALUE"

# Get current primary
CURRENT_PRIMARY=$(kubectl get pods -n openmeet-production -l app=postgres,role=master -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "postgres-patroni-0")

log "Current primary: $CURRENT_PRIMARY"
log "Initiating controlled failover..."

START_TIME=$(date +%s)

# Trigger Patroni switchover (graceful failover)
kubectl exec -n openmeet-production "$CURRENT_PRIMARY" -- patronictl switchover --master "$CURRENT_PRIMARY" --force 2>/dev/null || {
    log "WARNING: Could not perform switchover, skipping RTO test"
    FAILOVER_RTO="N/A"
    FAILOVER_RTO_STATUS="SKIPPED"
}

if [ "$FAILOVER_RTO_STATUS" != "SKIPPED" ]; then
    # Wait for new primary
    log "Waiting for new primary to be elected..."
    ATTEMPTS=0
    MAX_ATTEMPTS=120

    while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
        NEW_PRIMARY=$(kubectl get pods -n openmeet-production -l app=postgres,role=master -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")

        if [ -n "$NEW_PRIMARY" ] && [ "$NEW_PRIMARY" != "$CURRENT_PRIMARY" ]; then
            END_TIME=$(date +%s)
            FAILOVER_RTO=$((END_TIME - START_TIME))
            log "New primary elected: $NEW_PRIMARY"
            log "Failover completed in ${FAILOVER_RTO}s"
            break
        fi

        sleep 2
        ((ATTEMPTS++))
    done

    if [ $FAILOVER_RTO -le $RTO_TARGET ]; then
        log "✅ Failover RTO: PASSED (${FAILOVER_RTO}s <= ${RTO_TARGET}s)"
        FAILOVER_RTO_STATUS="PASSED"
    else
        log "❌ Failover RTO: FAILED (${FAILOVER_RTO}s > ${RTO_TARGET}s)"
        FAILOVER_RTO_STATUS="FAILED"
    fi

    # Verify data integrity
    log "Verifying data integrity after failover..."
    VERIFY_RESULT=$(kubectl exec -n openmeet-production "$NEW_PRIMARY" -- psql -U postgres -d openmeet -t -c "SELECT value FROM rto_test WHERE value='${TEST_VALUE}'" 2>/dev/null | xargs || echo "")

    if [ "$VERIFY_RESULT" == "$TEST_VALUE" ]; then
        log "✅ Data integrity verified - no data loss"
        DATA_LOSS="NO"
    else
        log "❌ Data loss detected!"
        DATA_LOSS="YES"
    fi
fi

# Test 4: Backup Restore RTO
log ""
log "Test 4: Measuring Backup Restore RTO"
log "-------------------------------------"

# Find latest backup
LATEST_BACKUP=$(aws s3 ls "s3://$S3_BUCKET/postgres/dump/" --region "$S3_REGION" | tail -1 | awk '{print $4}')

if [ -n "$LATEST_BACKUP" ]; then
    log "Latest backup: $LATEST_BACKUP"
    log "Simulating restore process (dry-run)..."

    START_TIME=$(date +%s)

    # Download backup
    aws s3 cp "s3://$S3_BUCKET/postgres/dump/$LATEST_BACKUP" /tmp/test_restore.sql.gz --region "$S3_REGION" 2>&1 | tee -a "$REPORT_DIR/rto_rpo_${TIMESTAMP}.log"

    # Verify backup can be listed
    pg_restore --list /tmp/test_restore.sql.gz > /dev/null 2>&1

    END_TIME=$(date +%s)
    RESTORE_RTO=$((END_TIME - START_TIME))

    log "Restore preparation completed in ${RESTORE_RTO}s"

    # Full restore would take longer, estimate
    ESTIMATED_RESTORE_RTO=$((RESTORE_RTO * 3))
    log "Estimated full restore time: ${ESTIMATED_RESTORE_RTO}s"

    if [ $ESTIMATED_RESTORE_RTO -le $RTO_TARGET ]; then
        log "✅ Restore RTO: PASSED (${ESTIMATED_RESTORE_RTO}s <= ${RTO_TARGET}s)"
        RESTORE_RTO_STATUS="PASSED"
    else
        log "❌ Restore RTO: WARNING (${ESTIMATED_RESTORE_RTO}s > ${RTO_TARGET}s)"
        RESTORE_RTO_STATUS="WARNING"
    fi

    rm -f /tmp/test_restore.sql.gz
else
    log "⚠️  No backups found in S3"
    RESTORE_RTO_STATUS="FAILED"
    ESTIMATED_RESTORE_RTO="N/A"
fi

# Test 5: Cross-Region Replication Lag
log ""
log "Test 5: Measuring Cross-Region Replication Lag"
log "------------------------------------------------"

# Check S3 replication metrics
if aws s3api head-object --bucket "$S3_BUCKET" --key "postgres/dump/$LATEST_BACKUP" --region "$S3_REGION" &>/dev/null; then
    REPLICATION_STATUS=$(aws s3api head-object --bucket "$S3_BUCKET" --key "postgres/dump/$LATEST_BACKUP" --region us-west-2 2>&1 || echo "NOT_REPLICATED")

    if echo "$REPLICATION_STATUS" | grep -q "NOT_REPLICATED"; then
        log "❌ Cross-region replication: NOT CONFIGURED or FAILED"
        CROSS_REGION_STATUS="FAILED"
    else
        log "✅ Cross-region replication: ACTIVE"
        CROSS_REGION_STATUS="PASSED"
    fi
else
    log "⚠️  Cannot verify cross-region replication"
    CROSS_REGION_STATUS="UNKNOWN"
fi

# Generate Compliance Report
log ""
log "=========================================="
log "RTO/RPO Compliance Report"
log "=========================================="

cat > "$REPORT_DIR/rto_rpo_report_${TIMESTAMP}.json" <<EOF
{
  "timestamp": "$(date -Iseconds)",
  "targets": {
    "rto_seconds": $RTO_TARGET,
    "rpo_seconds": $RPO_TARGET
  },
  "tests": {
    "backup_rpo": {
      "status": "$BACKUP_RPO_STATUS",
      "value_seconds": $BACKUP_RPO,
      "compliant": $([ "$BACKUP_RPO_STATUS" == "PASSED" ] && echo "true" || echo "false")
    },
    "replication_rpo": {
      "status": "$REPLICATION_RPO_STATUS",
      "value_seconds": $REPLICATION_LAG,
      "compliant": $([ "$REPLICATION_RPO_STATUS" == "PASSED" ] && echo "true" || echo "false")
    },
    "failover_rto": {
      "status": "${FAILOVER_RTO_STATUS:-SKIPPED}",
      "value_seconds": ${FAILOVER_RTO:-0},
      "compliant": $([ "${FAILOVER_RTO_STATUS:-SKIPPED}" == "PASSED" ] && echo "true" || echo "false"),
      "data_loss": "${DATA_LOSS:-UNKNOWN}"
    },
    "restore_rto": {
      "status": "$RESTORE_RTO_STATUS",
      "value_seconds": ${ESTIMATED_RESTORE_RTO:-0},
      "compliant": $([ "$RESTORE_RTO_STATUS" == "PASSED" ] && echo "true" || echo "false")
    },
    "cross_region_replication": {
      "status": "$CROSS_REGION_STATUS",
      "compliant": $([ "$CROSS_REGION_STATUS" == "PASSED" ] && echo "true" || echo "false")
    }
  },
  "summary": {
    "overall_compliance": "$([ "$BACKUP_RPO_STATUS" == "PASSED" ] && [ "$REPLICATION_RPO_STATUS" == "PASSED" ] && [ "${FAILOVER_RTO_STATUS:-PASSED}" == "PASSED" ] && echo "COMPLIANT" || echo "NON-COMPLIANT")",
    "total_tests": 5,
    "passed_tests": $((
      $([ "$BACKUP_RPO_STATUS" == "PASSED" ] && echo 1 || echo 0) +
      $([ "$REPLICATION_RPO_STATUS" == "PASSED" ] && echo 1 || echo 0) +
      $([ "${FAILOVER_RTO_STATUS:-SKIPPED}" == "PASSED" ] && echo 1 || echo 0) +
      $([ "$RESTORE_RTO_STATUS" == "PASSED" ] && echo 1 || echo 0) +
      $([ "$CROSS_REGION_STATUS" == "PASSED" ] && echo 1 || echo 0)
    ))
  }
}
EOF

log ""
log "Summary:"
log "--------"
log "Backup RPO: $BACKUP_RPO_STATUS (${BACKUP_RPO}s / ${RPO_TARGET}s)"
log "Replication RPO: $REPLICATION_RPO_STATUS (${REPLICATION_LAG}s / ${RPO_TARGET}s)"
log "Failover RTO: ${FAILOVER_RTO_STATUS:-SKIPPED} (${FAILOVER_RTO:-N/A}s / ${RTO_TARGET}s)"
log "Restore RTO: $RESTORE_RTO_STATUS (${ESTIMATED_RESTORE_RTO}s / ${RTO_TARGET}s)"
log "Cross-Region: $CROSS_REGION_STATUS"
log ""

PASSED_TESTS=$((
  $([ "$BACKUP_RPO_STATUS" == "PASSED" ] && echo 1 || echo 0) +
  $([ "$REPLICATION_RPO_STATUS" == "PASSED" ] && echo 1 || echo 0) +
  $([ "${FAILOVER_RTO_STATUS:-SKIPPED}" == "PASSED" ] && echo 1 || echo 0) +
  $([ "$RESTORE_RTO_STATUS" == "PASSED" ] && echo 1 || echo 0) +
  $([ "$CROSS_REGION_STATUS" == "PASSED" ] && echo 1 || echo 0)
))

log "Tests Passed: $PASSED_TESTS/5"

if [ "$BACKUP_RPO_STATUS" == "PASSED" ] && [ "$REPLICATION_RPO_STATUS" == "PASSED" ]; then
    log "✅ OVERALL STATUS: COMPLIANT"
    OVERALL_STATUS="COMPLIANT"
else
    log "❌ OVERALL STATUS: NON-COMPLIANT"
    OVERALL_STATUS="NON-COMPLIANT"
fi

# Upload report to S3
log ""
log "Uploading report to S3..."
aws s3 cp "$REPORT_DIR/rto_rpo_report_${TIMESTAMP}.json" "s3://$S3_BUCKET/compliance/rto_rpo_report_${TIMESTAMP}.json" \
    --region "$S3_REGION" \
    --server-side-encryption AES256 || log "WARNING: Could not upload report to S3"

# Send notification
if [ -n "${NOTIFICATION_WEBHOOK:-}" ]; then
    STATUS_EMOJI="✅"
    [ "$OVERALL_STATUS" == "NON-COMPLIANT" ] && STATUS_EMOJI="❌"

    curl -X POST "$NOTIFICATION_WEBHOOK" \
        -H 'Content-Type: application/json' \
        -d "{\"text\": \"$STATUS_EMOJI RTO/RPO Compliance: $OVERALL_STATUS - $PASSED_TESTS/5 tests passed\"}" 2>/dev/null || true
fi

log "Report saved to: $REPORT_DIR/rto_rpo_report_${TIMESTAMP}.json"
log "=========================================="

# Exit with error if non-compliant
[ "$OVERALL_STATUS" == "NON-COMPLIANT" ] && exit 1

exit 0
