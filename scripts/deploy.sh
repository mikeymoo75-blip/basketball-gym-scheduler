#!/usr/bin/env bash
#
# Deploy MP Basketball on the server:
#   1. Back up the live SQLite database (if the app is already running).
#   2. Pull the latest code for the current branch.
#   3. Rebuild and restart the Docker containers.
#
# Usage (from the project directory, e.g. /opt/mp-basketball):
#   ./scripts/deploy.sh
#
# If your user is not in the "docker" group, run it with sudo:
#   sudo ./scripts/deploy.sh
#
# Your .env and the "gym-data" volume are never touched by this script.

set -euo pipefail

# Always run from the repository root (the parent of this script's directory).
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

DB_SERVICE="app"
DB_PATH_IN_CONTAINER="/data/prod.db"
BACKUP_DIR="backups"

echo "==> MP Basketball deploy starting at $(date)"

# 1. Back up the current database, but only if the app container is running and
#    the database file exists (skipped automatically on a first-time deploy).
if [ -n "$(docker compose ps -q "$DB_SERVICE" 2>/dev/null)" ] \
  && docker compose exec -T "$DB_SERVICE" test -f "$DB_PATH_IN_CONTAINER" 2>/dev/null; then
  mkdir -p "$BACKUP_DIR"
  backup_file="$BACKUP_DIR/prod-$(date +%Y%m%d-%H%M%S).db"
  echo "==> Backing up database to $backup_file"
  docker compose cp "$DB_SERVICE:$DB_PATH_IN_CONTAINER" "$backup_file"
  echo "==> Backup saved: $backup_file"
else
  echo "==> No running app container with a database found; skipping backup (first deploy?)."
fi

# 2. Pull the latest merged code. --ff-only avoids surprise merge commits on the server.
echo "==> Pulling latest code"
git pull --ff-only

# 3. Rebuild and restart in the background.
echo "==> Building and starting containers"
docker compose up -d --build

# 4. Show status and recent logs.
echo "==> Current status:"
docker compose ps
echo "==> Recent app logs:"
docker compose logs "$DB_SERVICE" --tail 30

echo "==> Deploy complete at $(date)"
