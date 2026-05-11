#!/bin/sh
set -eu

PROJECT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
DATA_DIR="${DATA_DIR:-$PROJECT_DIR/data}"
BACKUP_DIR="$DATA_DIR/backups"
TARGET="$DATA_DIR/records.json"

cd "$PROJECT_DIR"

if [ "${1:-}" ]; then
  SOURCE="$1"
else
  SOURCE="$(ls -1t "$BACKUP_DIR"/records-*.json 2>/dev/null | head -n 1 || true)"
fi

if [ -z "${SOURCE:-}" ] || [ ! -f "$SOURCE" ]; then
  echo "No records backup found. Pass a backup path, for example:" >&2
  echo "./restore-records.sh data/backups/records-before-deploy-YYYYMMDD-HHMMSS.json" >&2
  exit 1
fi

if command -v node >/dev/null 2>&1; then
  node -e "const fs=require('fs'); const data=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); if(!Array.isArray(data)) throw new Error('backup is not an array'); console.log(data.length)" "$SOURCE" >/dev/null
else
  echo "Node.js not found on host; skipped backup JSON validation."
fi

mkdir -p "$DATA_DIR" "$BACKUP_DIR"
if [ -f "$TARGET" ]; then
  cp "$TARGET" "$BACKUP_DIR/records-before-restore-$(date +%Y%m%d-%H%M%S).json"
fi

cp "$SOURCE" "$TARGET"
echo "Restored records from $SOURCE to $TARGET"
echo "Restart service with: docker compose restart zw-checkin"
