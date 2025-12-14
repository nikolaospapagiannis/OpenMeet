#!/bin/bash

###############################################################################
# Chaos Engineering Test Runner
# Runs chaos experiments and monitors system behavior
###############################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULTS_DIR="${RESULTS_DIR:-/var/log/chaos-tests}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$RESULTS_DIR/chaos_${TIMESTAMP}.log"
}

error_exit() {
    log "ERROR: $1"
    exit 1
}

# Create results directory
mkdir -p "$RESULTS_DIR"

log "=========================================="
log "Starting Chaos Engineering Tests"
log "=========================================="

# Check if Chaos Mesh is installed
if ! kubectl get namespace chaos-mesh &>/dev/null; then
    log "Chaos Mesh not installed. Installing..."
    bash "$SCRIPT_DIR/install-chaos-mesh.sh" || error_exit "Failed to install Chaos Mesh"
fi

# Function to run experiment
run_experiment() {
    local experiment_file="$1"
    local experiment_name=$(basename "$experiment_file" .yaml)

    log "Running experiment: $experiment_name"

    # Apply chaos experiment
    kubectl apply -f "$experiment_file" || error_exit "Failed to apply $experiment_name"

    # Monitor system metrics during chaos
    local start_time=$(date +%s)

    # Capture baseline metrics
    log "Capturing baseline metrics..."
    kubectl top pods -n openmeet-production > "$RESULTS_DIR/${experiment_name}_metrics_before.txt" 2>&1 || true
    kubectl get pods -n openmeet-production -o wide > "$RESULTS_DIR/${experiment_name}_pods_before.txt" 2>&1 || true

    # Wait for chaos to take effect
    sleep 30

    # Capture during-chaos metrics
    log "Capturing during-chaos metrics..."
    kubectl top pods -n openmeet-production > "$RESULTS_DIR/${experiment_name}_metrics_during.txt" 2>&1 || true
    kubectl get pods -n openmeet-production -o wide > "$RESULTS_DIR/${experiment_name}_pods_during.txt" 2>&1 || true

    # Check application health
    log "Checking application health during chaos..."
    if curl -f -s -o /dev/null -w "%{http_code}" http://api.openmeet.ai/health | grep -q "200"; then
        log "✅ Application remained healthy during chaos"
        HEALTH_STATUS="PASSED"
    else
        log "❌ Application health check failed during chaos"
        HEALTH_STATUS="FAILED"
    fi

    # Wait for experiment to complete
    local duration=$(kubectl get -f "$experiment_file" -o jsonpath='{.spec.duration}' | sed 's/[^0-9]*//g')
    duration=${duration:-60}
    log "Waiting ${duration}s for experiment to complete..."
    sleep "$duration"

    # Cleanup experiment
    log "Cleaning up experiment..."
    kubectl delete -f "$experiment_file" || true

    # Wait for recovery
    sleep 30

    # Capture post-chaos metrics
    log "Capturing post-chaos metrics..."
    kubectl top pods -n openmeet-production > "$RESULTS_DIR/${experiment_name}_metrics_after.txt" 2>&1 || true
    kubectl get pods -n openmeet-production -o wide > "$RESULTS_DIR/${experiment_name}_pods_after.txt" 2>&1 || true

    # Check recovery
    log "Verifying system recovery..."
    local failed_pods=$(kubectl get pods -n openmeet-production --field-selector=status.phase!=Running --no-headers 2>/dev/null | wc -l)

    if [ "$failed_pods" -eq 0 ]; then
        log "✅ All pods recovered successfully"
        RECOVERY_STATUS="PASSED"
    else
        log "⚠️  $failed_pods pods failed to recover"
        RECOVERY_STATUS="FAILED"
    fi

    local end_time=$(date +%s)
    local total_time=$((end_time - start_time))

    # Generate experiment report
    cat >> "$RESULTS_DIR/chaos_${TIMESTAMP}.log" <<EOF

Experiment: $experiment_name
Duration: ${total_time}s
Health Status: $HEALTH_STATUS
Recovery Status: $RECOVERY_STATUS
---
EOF

    log "Experiment $experiment_name completed in ${total_time}s"
}

# Run all experiments
experiments=(
    "$SCRIPT_DIR/experiments/pod-failure.yaml"
    "$SCRIPT_DIR/experiments/network-delay.yaml"
    "$SCRIPT_DIR/experiments/cpu-stress.yaml"
    "$SCRIPT_DIR/experiments/memory-stress.yaml"
    "$SCRIPT_DIR/experiments/disk-failure.yaml"
)

TOTAL_EXPERIMENTS=${#experiments[@]}
PASSED_EXPERIMENTS=0
FAILED_EXPERIMENTS=0

for experiment in "${experiments[@]}"; do
    if [ -f "$experiment" ]; then
        log ""
        log "=========================================="
        run_experiment "$experiment"

        if [ "$HEALTH_STATUS" == "PASSED" ] && [ "$RECOVERY_STATUS" == "PASSED" ]; then
            ((PASSED_EXPERIMENTS++))
        else
            ((FAILED_EXPERIMENTS++))
        fi
        log "=========================================="

        # Wait between experiments
        log "Waiting 2 minutes before next experiment..."
        sleep 120
    else
        log "WARNING: Experiment file not found: $experiment"
    fi
done

# Generate summary report
log ""
log "=========================================="
log "Chaos Engineering Test Summary"
log "=========================================="
log "Total Experiments: $TOTAL_EXPERIMENTS"
log "Passed: $PASSED_EXPERIMENTS"
log "Failed: $FAILED_EXPERIMENTS"
log "Success Rate: $(( PASSED_EXPERIMENTS * 100 / TOTAL_EXPERIMENTS ))%"
log "Results saved to: $RESULTS_DIR/chaos_${TIMESTAMP}.log"

# Upload results to S3
if [ -n "${S3_BUCKET:-}" ]; then
    aws s3 cp "$RESULTS_DIR/chaos_${TIMESTAMP}.log" "s3://$S3_BUCKET/chaos-tests/chaos_${TIMESTAMP}.log" \
        --region "${S3_REGION:-us-east-1}" 2>/dev/null || log "WARNING: Could not upload results to S3"
fi

# Send notification
if [ -n "${NOTIFICATION_WEBHOOK:-}" ]; then
    STATUS_EMOJI="✅"
    [ "$FAILED_EXPERIMENTS" -gt 0 ] && STATUS_EMOJI="⚠️"

    curl -X POST "$NOTIFICATION_WEBHOOK" \
        -H 'Content-Type: application/json' \
        -d "{\"text\": \"$STATUS_EMOJI Chaos tests completed: $PASSED_EXPERIMENTS/$TOTAL_EXPERIMENTS passed\"}" 2>/dev/null || true
fi

# Exit with error if any experiments failed
[ "$FAILED_EXPERIMENTS" -gt 0 ] && exit 1

exit 0
