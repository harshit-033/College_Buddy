#!/usr/bin/env bash
# ==============================================================================
# CampusIQ / CollegeBuddy — PostgreSQL Database Backup Script
# Usage: ./scripts/backup_db.sh [BACKUP_DIR]
#
# RESTORE INSTRUCTIONS:
# To restore from a compressed backup file:
# 1. Using Docker:
#    gunzip -c backup_YYYY-MM-DD_HHMMSS.sql.gz | docker exec -i campusiq_postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
# 2. Using direct connection string:
#    gunzip -c backup_YYYY-MM-DD_HHMMSS.sql.gz | psql "$DATABASE_URL"
# ==============================================================================

set -euo pipefail

BACKUP_DIR="${1:-./backups}"
TIMESTAMP=$(date +"%Y-%m-%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "Starting PostgreSQL database backup..."

if [ -n "${DATABASE_URL:-}" ]; then
    echo "Backing up via DATABASE_URL..."
    pg_dump "$DATABASE_URL" | gzip > "${BACKUP_FILE}"
elif command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' 2>/dev/null | grep -q "campusiq_postgres"; then
    echo "Backing up from running Docker container 'campusiq_postgres'..."
    docker exec -t campusiq_postgres pg_dump -U "${POSTGRES_USER:-collegebuddy_user}" "${POSTGRES_DB:-collegebuddy_db}" | gzip > "${BACKUP_FILE}"
else
    echo "ERROR: Neither DATABASE_URL is available nor is container 'campusiq_postgres' reachable."
    echo "Please set DATABASE_URL or run inside an environment with access to PostgreSQL."
    exit 1
fi

echo "Backup created successfully: ${BACKUP_FILE} ($(du -h "${BACKUP_FILE}" | cut -f1))"
