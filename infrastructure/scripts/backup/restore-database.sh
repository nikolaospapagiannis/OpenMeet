#!/bin/bash

###############################################################################
# Database Restore Script for OpenMeet Platform
# Restores PostgreSQL, MongoDB, and Redis data from backups
###############################################################################

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/openmeet}"
S3_BUCKET="${S3_BUCKET:-openmeet-backups}"

# Database credentials
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-openmeet}"

MONGODB_HOST="${MONGODB_HOST:-localhost}"
MONGODB_PORT="${MONGODB_PORT:-27017}"
MONGODB_DB="${MONGODB_DB:-openmeet}"

REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"

# Logging function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

# Error handler
error_exit() {
    log "ERROR: $1"
    exit 1
}

# Display usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -p, --postgres FILE     PostgreSQL backup file to restore"
    echo "  -m, --mongodb FILE      MongoDB backup archive to restore"
    echo "  -r, --redis FILE        Redis RDB file to restore"
    echo "  -s, --from-s3 DATE      Restore from S3 backup (format: YYYYMMDD_HHMMSS)"
    echo "  -h, --help             Display this help message"
    echo ""
    exit 1
}

# Parse arguments
POSTGRES_FILE=""
MONGODB_FILE=""
REDIS_FILE=""
FROM_S3=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--postgres)
            POSTGRES_FILE="$2"
            shift 2
            ;;
        -m|--mongodb)
            MONGODB_FILE="$2"
            shift 2
            ;;
        -r|--redis)
            REDIS_FILE="$2"
            shift 2
            ;;
        -s|--from-s3)
            FROM_S3="$2"
            shift 2
            ;;
        -h|--help)
            usage
            ;;
        *)
            echo "Unknown option: $1"
            usage
            ;;
    esac
done

# Download from S3 if specified
if [ -n "$FROM_S3" ]; then
    log "Downloading backups from S3 for timestamp: $FROM_S3"

    mkdir -p "$BACKUP_DIR"

    aws s3 cp "s3://$S3_BUCKET/postgres/postgres_${FROM_S3}.sql.gz" "$BACKUP_DIR/" || error_exit "Failed to download PostgreSQL backup"
    aws s3 cp "s3://$S3_BUCKET/mongodb/mongodb_${FROM_S3}.tar.gz" "$BACKUP_DIR/" || error_exit "Failed to download MongoDB backup"
    aws s3 cp "s3://$S3_BUCKET/redis/redis_${FROM_S3}.rdb" "$BACKUP_DIR/" || error_exit "Failed to download Redis backup"

    POSTGRES_FILE="$BACKUP_DIR/postgres_${FROM_S3}.sql.gz"
    MONGODB_FILE="$BACKUP_DIR/mongodb_${FROM_S3}.tar.gz"
    REDIS_FILE="$BACKUP_DIR/redis_${FROM_S3}.rdb"

    log "Download completed"
fi

# Restore PostgreSQL
if [ -n "$POSTGRES_FILE" ]; then
    log "Restoring PostgreSQL from: $POSTGRES_FILE"

    # Warning prompt
    read -p "This will OVERWRITE the current PostgreSQL database. Continue? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
        log "PostgreSQL restore cancelled"
    else
        PGPASSWORD="$POSTGRES_PASSWORD" pg_restore \
            -h "$POSTGRES_HOST" \
            -p "$POSTGRES_PORT" \
            -U "$POSTGRES_USER" \
            -d "$POSTGRES_DB" \
            --clean \
            --if-exists \
            "$POSTGRES_FILE" || error_exit "PostgreSQL restore failed"

        log "PostgreSQL restore completed"
    fi
fi

# Restore MongoDB
if [ -n "$MONGODB_FILE" ]; then
    log "Restoring MongoDB from: $MONGODB_FILE"

    read -p "This will OVERWRITE the current MongoDB database. Continue? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
        log "MongoDB restore cancelled"
    else
        # Extract archive
        TEMP_DIR=$(mktemp -d)
        tar -xzf "$MONGODB_FILE" -C "$TEMP_DIR"

        mongorestore \
            --host "$MONGODB_HOST" \
            --port "$MONGODB_PORT" \
            --db "$MONGODB_DB" \
            --drop \
            --gzip \
            "$TEMP_DIR"/* || error_exit "MongoDB restore failed"

        rm -rf "$TEMP_DIR"

        log "MongoDB restore completed"
    fi
fi

# Restore Redis
if [ -n "$REDIS_FILE" ]; then
    log "Restoring Redis from: $REDIS_FILE"

    read -p "This will OVERWRITE the current Redis data. Continue? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
        log "Redis restore cancelled"
    else
        # Stop Redis service (adjust based on your setup)
        log "Stopping Redis service..."
        systemctl stop redis || docker stop redis || true

        # Copy RDB file
        cp "$REDIS_FILE" /var/lib/redis/dump.rdb

        # Start Redis service
        log "Starting Redis service..."
        systemctl start redis || docker start redis || true

        log "Redis restore completed"
    fi
fi

log "Restore process completed!"

exit 0
