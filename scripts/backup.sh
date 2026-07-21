#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="$ROOT_DIR/backups"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
ARCHIVE_NAME="cloudpattern-cad-backup-$TIMESTAMP.zip"

mkdir -p "$BACKUP_DIR"

cd "$ROOT_DIR"

zip -r "$BACKUP_DIR/$ARCHIVE_NAME" . \
  -x "node_modules/*" \
  -x "*/node_modules/*" \
  -x ".next/*" \
  -x "*/.next/*" \
  -x "dist/*" \
  -x "*/dist/*" \
  -x "backups/*" \
  -x "*.env" \
  -x "*/.env"

echo "Backup created: $BACKUP_DIR/$ARCHIVE_NAME"

if command -v git >/dev/null 2>&1 && [ -d "$ROOT_DIR/.git" ]; then
  if [ -n "$(git -C "$ROOT_DIR" status --porcelain)" ]; then
    echo "Warning: uncommitted changes present. Backup includes working tree, but git history is not fully in sync."
    git -C "$ROOT_DIR" status --short
  else
    echo "Git working tree is clean; HEAD is $(git -C "$ROOT_DIR" rev-parse --short HEAD)."
  fi
else
  echo "No git repository found at $ROOT_DIR; skipping commit verification."
fi
