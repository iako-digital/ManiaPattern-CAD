#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="$ROOT_DIR/backups"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
ARCHIVE_NAME="cloudpattern-cad-backup-$TIMESTAMP.zip"

mkdir -p "$BACKUP_DIR"

cd "$ROOT_DIR"

if command -v zip >/dev/null 2>&1; then
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
elif command -v git >/dev/null 2>&1 && [ -d "$ROOT_DIR/.git" ]; then
  # No `zip` binary on this machine. git archive bundles exactly the
  # committed tree (so node_modules/.env/build output are excluded for
  # free, since they were never tracked) without needing external tools.
  echo "No 'zip' binary found; using 'git archive' of the committed tree instead."
  git archive --format=zip -o "$BACKUP_DIR/$ARCHIVE_NAME" HEAD
elif command -v powershell.exe >/dev/null 2>&1; then
  echo "No 'zip' binary or git repo found; falling back to PowerShell Compress-Archive."
  STAGE_DIR="$(mktemp -d)"
  mkdir -p "$STAGE_DIR/payload"
  find . -mindepth 1 -maxdepth 1 \
    ! -name node_modules ! -name .next ! -name dist ! -name backups ! -name .env \
    -exec cp -r {} "$STAGE_DIR/payload/" \;
  WIN_STAGE_PAYLOAD="$(cd "$STAGE_DIR/payload" && pwd -W 2>/dev/null || pwd)"
  WIN_TARGET="$(cd "$BACKUP_DIR" && pwd -W 2>/dev/null || pwd)/$ARCHIVE_NAME"
  powershell.exe -NoProfile -Command "Compress-Archive -Path '$WIN_STAGE_PAYLOAD/*' -DestinationPath '$WIN_TARGET' -Force"
  rm -rf "$STAGE_DIR"
else
  echo "Error: no zip, git, or PowerShell available to create an archive." >&2
  exit 1
fi

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
