#!/bin/sh
# ---------------------------------------------------------------------------
# PostgreSQL automated backup script
# Meant to run as a daily cron inside the db-backup container.
#
# Backups are stored in /backups with a 7-day retention.
# ---------------------------------------------------------------------------

set -e

BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="memolist_${TIMESTAMP}.sql.gz"

echo "[$(date)] Starting backup…"

PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
  -h db \
  -U "${POSTGRES_USER:-memolist}" \
  -d "${POSTGRES_DB:-memolist}" \
  --no-owner \
  --no-privileges \
  | gzip > "${BACKUP_DIR}/${FILENAME}"

echo "[$(date)] Backup saved: ${FILENAME} ($(du -h "${BACKUP_DIR}/${FILENAME}" | cut -f1))"

# Retention: delete backups older than 7 days
find "${BACKUP_DIR}" -name "memolist_*.sql.gz" -mtime +7 -delete
echo "[$(date)] Cleanup done. Current backups:"
ls -lh "${BACKUP_DIR}"/memolist_*.sql.gz 2>/dev/null || echo "  (none)"
