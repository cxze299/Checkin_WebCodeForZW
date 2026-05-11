#!/bin/sh
set -eu

PROJECT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
DATA_DIR="${DATA_DIR:-$PROJECT_DIR/data}"
BACKUP_DIR="$DATA_DIR/backups"
STAMP="$(date +%Y%m%d-%H%M%S)"

cd "$PROJECT_DIR"
mkdir -p "$DATA_DIR" "$BACKUP_DIR"

backup_file() {
  file="$1"
  label="$2"
  if [ -f "$file" ]; then
    cp "$file" "$BACKUP_DIR/$label-before-deploy-$STAMP.json"
    echo "Backed up $file"
  fi
}

validate_json() {
  file="$1"
  if [ ! -f "$file" ]; then
    return 0
  fi
  if command -v node >/dev/null 2>&1; then
    node -e "JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8'))" "$file"
  else
    echo "Node.js not found on host; skipped JSON validation for $file"
  fi
}

[ -f "$DATA_DIR/records.json" ] || printf '[]\n' > "$DATA_DIR/records.json"
[ -f "$DATA_DIR/testimonials.json" ] || printf '[]\n' > "$DATA_DIR/testimonials.json"

validate_json "$DATA_DIR/records.json"
validate_json "$DATA_DIR/testimonials.json"
validate_json "$DATA_DIR/weekly-schedule.json"

backup_file "$DATA_DIR/records.json" "records"
backup_file "$DATA_DIR/testimonials.json" "testimonials"
backup_file "$DATA_DIR/weekly-schedule.json" "weekly-schedule"

before_count=0
if command -v node >/dev/null 2>&1; then
  before_count="$(node -e "const fs=require('fs'); const p=process.argv[1]; const data=JSON.parse(fs.readFileSync(p,'utf8')); console.log(Array.isArray(data) ? data.length : 0)" "$DATA_DIR/records.json")"
fi

docker compose up -d --build

if command -v curl >/dev/null 2>&1; then
  curl --fail --silent --show-error --max-time 10 "http://127.0.0.1:777/health" >/dev/null
fi

if command -v node >/dev/null 2>&1; then
  after_count="$(node -e "const fs=require('fs'); const p=process.argv[1]; const data=JSON.parse(fs.readFileSync(p,'utf8')); console.log(Array.isArray(data) ? data.length : 0)" "$DATA_DIR/records.json")"
  if [ "$before_count" -gt 0 ] && [ "$after_count" -lt "$before_count" ]; then
    echo "WARNING: records.json count dropped from $before_count to $after_count after deploy." >&2
    echo "Restore with: ./restore-records.sh \"$BACKUP_DIR/records-before-deploy-$STAMP.json\"" >&2
    exit 1
  fi
fi

echo "Deploy finished safely. Backup stamp: $STAMP"
