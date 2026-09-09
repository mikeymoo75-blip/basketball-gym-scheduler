#!/usr/bin/env bash
#
# Restore the MP Basketball database from a backup created by scripts/deploy.sh.
#
# Usage (from the project directory, e.g. /opt/mp-basketball):
#   ./scripts/restore.sh                         # lists available backups
#   ./scripts/restore.sh backups/prod-XXXX.db    # restores that backup
#   ./scripts/restore.sh backups/prod-XXXX.db -y # restores without the confirm prompt
#
# What it does, in order:
#   1. Safety-copies the CURRENT database to backups/pre-restore-<timestamp>.db
#      (so a restore is itself reversible).
#   2. Stops the app, copies the chosen backup into the volume, clears stale
#      SQLite -wal/-shm files, and starts the app again.
#
# Your .env and the "gym-data" volume itself are preserved; only the database
# file inside it is replaced.

set -euo pipefail

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

DB_SERVICE="app"
DB_PATH_IN_CONTAINER="/data/prod.db"
BACKUP_DIR="backups"

backup="${1:-}"
assume_yes="${2:-}"

# With no argument, list the backups the user can choose from and exit.
if [ -z "$backup" ]; then
  echo "Usage: ./scripts/restore.sh <backup-file> [-y]"
  echo ""
  if [ -d "$BACKUP_DIR" ] && ls "$BACKUP_DIR"/*.db >/dev/null 2>&1; then
    echo "Available backups (newest last):"
    ls -1tr "$BACKUP_DIR"/*.db
  else
    echo "No backups found in ./$BACKUP_DIR yet. Run ./scripts/deploy.sh to create one."
  fi
  exit 1
fi

if [ ! -f "$backup" ]; then
  echo "ERROR: backup file not found: $backup" >&2
  exit 1
fi

if [ -z "$(docker compose ps -q "$DB_SERVICE" 2>/dev/null)" ]; then
  echo "ERROR: the '$DB_SERVICE' service does not exist here. Run this from your project directory (e.g. /opt/mp-basketball)." >&2
  exit 1
fi

echo "About to REPLACE the live database with: $backup"
if [ "$assume_yes" != "-y" ] && [ "$assume_yes" != "--yes" ]; then
  read -r -p "Type 'yes' to continue: " reply
  if [ "$reply" != "yes" ]; then
    echo "Aborted. Nothing was changed."
    exit 1
  fi
fi

# 1. Safety copy of the current database before we overwrite it.
mkdir -p "$BACKUP_DIR"
safety="$BACKUP_DIR/pre-restore-$(date +%Y%m%d-%H%M%S).db"
if docker compose exec -T "$DB_SERVICE" test -f "$DB_PATH_IN_CONTAINER" 2>/dev/null; then
  echo "==> Saving current database to $safety"
  docker compose cp "$DB_SERVICE:$DB_PATH_IN_CONTAINER" "$safety"
fi

# 2. Stop the app so SQLite is not mid-write, swap the file, clear WAL/SHM, restart.
echo "==> Stopping app"
docker compose stop "$DB_SERVICE"

echo "==> Restoring $backup into the database volume"
docker compose cp "$backup" "$DB_SERVICE:$DB_PATH_IN_CONTAINER"
docker compose run --rm --no-deps --entrypoint sh "$DB_SERVICE" \
  -c "rm -f ${DB_PATH_IN_CONTAINER}-wal ${DB_PATH_IN_CONTAINER}-shm" >/dev/null 2>&1 || true

echo "==> Starting app"
docker compose start "$DB_SERVICE"

echo "==> Restore complete. Recent logs:"
docker compose logs "$DB_SERVICE" --tail 30
echo "==> If anything looks wrong, your previous database was saved at: $safety"
