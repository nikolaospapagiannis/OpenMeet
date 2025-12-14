#!/bin/bash

###############################################################################
# Automated Backup Script for All Databases
# Orchestrates backups for PostgreSQL, MongoDB, Redis, and Elasticsearch
###############################################################################

set -euo pipefail

# Configuration
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/openmeet}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$BACKUP_ROOT/automated_backup_${TIMESTAMP}.log"

# Logging
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

error_count=0

# Create backup root
mkdir -p "$BACKUP_ROOT"

log "=========================================="
log "Starting automated backup process"
log "=========================================="

# Backup PostgreSQL
log "Step 1/5: Backing up PostgreSQL..."
if bash "$SCRIPT_DIR/backup-postgres.sh" >> "$LOG_FILE" 2>&1; then
    log "✅ PostgreSQL backup completed"
else
    log "❌ PostgreSQL backup failed"
    ((error_count++))
fi

# Backup MongoDB
log "Step 2/5: Backing up MongoDB..."
if bash "$SCRIPT_DIR/backup-mongodb.sh" >> "$LOG_FILE" 2>&1; then
    log "✅ MongoDB backup completed"
else
    log "❌ MongoDB backup failed"
    ((error_count++))
fi

# Backup Redis
log "Step 3/5: Backing up Redis..."
if bash "$SCRIPT_DIR/backup-redis.sh" >> "$LOG_FILE" 2>&1; then
    log "✅ Redis backup completed"
else
    log "❌ Redis backup failed"
    ((error_count++))
fi

# Backup Elasticsearch
log "Step 4/5: Backing up Elasticsearch..."
if [ -f "$SCRIPT_DIR/backup-elasticsearch.sh" ]; then
    if bash "$SCRIPT_DIR/backup-elasticsearch.sh" >> "$LOG_FILE" 2>&1; then
        log "✅ Elasticsearch backup completed"
    else
        log "❌ Elasticsearch backup failed"
        ((error_count++))
    fi
else
    log "⚠️  Elasticsearch backup script not found, skipping"
fi

# Backup Kubernetes configurations
log "Step 5/5: Backing up Kubernetes configurations..."
CONFIG_BACKUP_DIR="$BACKUP_ROOT/k8s-config_${TIMESTAMP}"
mkdir -p "$CONFIG_BACKUP_DIR"

if kubectl get all --all-namespaces -o yaml > "$CONFIG_BACKUP_DIR/all-resources.yaml" 2>/dev/null; then
    kubectl get configmaps --all-namespaces -o yaml > "$CONFIG_BACKUP_DIR/configmaps.yaml" 2>/dev/null || true
    kubectl get secrets --all-namespaces -o yaml > "$CONFIG_BACKUP_DIR/secrets.yaml" 2>/dev/null || true
    kubectl get pvc --all-namespaces -o yaml > "$CONFIG_BACKUP_DIR/pvcs.yaml" 2>/dev/null || true

    tar -czf "$CONFIG_BACKUP_DIR.tar.gz" -C "$BACKUP_ROOT" "k8s-config_${TIMESTAMP}"
    rm -rf "$CONFIG_BACKUP_DIR"

    # Upload to S3
    if [ -n "${S3_BUCKET:-}" ]; then
        aws s3 cp "$CONFIG_BACKUP_DIR.tar.gz" "s3://$S3_BUCKET/k8s-config/config_${TIMESTAMP}.tar.gz" \
            --region "${S3_REGION:-us-east-1}" \
            --storage-class STANDARD_IA \
            --server-side-encryption AES256 2>/dev/null || log "WARNING: K8s config S3 upload failed"
    fi

    log "✅ Kubernetes configuration backup completed"
else
    log "⚠️  Kubernetes backup failed (kubectl not available or no permissions)"
fi

# Generate backup summary
log "=========================================="
log "Backup Summary"
log "=========================================="
log "Timestamp: $TIMESTAMP"
log "Errors: $error_count"

# Calculate total backup size
if [ -d "$BACKUP_ROOT" ]; then
    TOTAL_SIZE=$(du -sh "$BACKUP_ROOT" | cut -f1)
    log "Total backup size: $TOTAL_SIZE"
fi

# Send notification
if [ -n "${NOTIFICATION_WEBHOOK:-}" ]; then
    if [ $error_count -eq 0 ]; then
        STATUS="✅ SUCCESS"
        MESSAGE="All backups completed successfully"
    else
        STATUS="⚠️ PARTIAL FAILURE"
        MESSAGE="Backup completed with $error_count error(s)"
    fi

    curl -X POST "$NOTIFICATION_WEBHOOK" \
        -H 'Content-Type: application/json' \
        -d "{\"text\": \"$STATUS: Automated backup - $MESSAGE\", \"timestamp\": \"$TIMESTAMP\"}" 2>/dev/null || true
fi

# Upload log to S3
if [ -n "${S3_BUCKET:-}" ]; then
    aws s3 cp "$LOG_FILE" "s3://$S3_BUCKET/logs/backup_${TIMESTAMP}.log" \
        --region "${S3_REGION:-us-east-1}" \
        --server-side-encryption AES256 2>/dev/null || true
fi

log "Automated backup process completed"

# Exit with error if any backups failed
if [ $error_count -gt 0 ]; then
    exit 1
fi

exit 0
