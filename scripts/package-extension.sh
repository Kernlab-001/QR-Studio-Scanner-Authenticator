#!/usr/bin/env bash
#
# Builds a Chrome Web Store ready zip for QR Studio.
#
# The zip root must contain manifest.json directly - the Chrome Web Store
# rejects an archive that nests everything inside a folder.
#
# Usage: ./scripts/package-extension.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

OUT_DIR="dist"
STAGE_DIR="$OUT_DIR/stage"

# --- validate the manifest ----------------------------------------------------
if [ ! -f manifest.json ]; then
  echo "error: manifest.json not found in $ROOT" >&2
  exit 1
fi

if command -v node >/dev/null 2>&1; then
  VERSION="$(node -p "require('./manifest.json').version")"
  node -e "JSON.parse(require('fs').readFileSync('manifest.json','utf8'))" \
    || { echo "error: manifest.json is not valid JSON" >&2; exit 1; }
else
  VERSION="$(grep -o '"version"[[:space:]]*:[[:space:]]*"[^"]*"' manifest.json | head -1 | cut -d'"' -f4)"
fi

echo "manifest.json OK - version $VERSION"

# --- collect the files to ship ------------------------------------------------
FILES=(manifest.json popup.html popup.css popup.js jsqr.js qrcode-generator.js)
if [ -d icons ]; then
  while IFS= read -r icon; do
    FILES+=("icons/$(basename "$icon")")
  done < <(find icons -maxdepth 1 -name '*.png' | sort)
fi

for file in "${FILES[@]}"; do
  if [ ! -f "$file" ]; then
    echo "error: missing expected file: $file" >&2
    exit 1
  fi
done

# --- build the zip ------------------------------------------------------------
rm -rf "$OUT_DIR"
mkdir -p "$STAGE_DIR"

for file in "${FILES[@]}"; do
  mkdir -p "$STAGE_DIR/$(dirname "$file")"
  cp "$file" "$STAGE_DIR/$file"
done

if command -v zip >/dev/null 2>&1; then
  (cd "$STAGE_DIR" && zip -qr "../qr-studio-$VERSION.zip" .)
else
  python3 - "$STAGE_DIR" "qr-studio-$VERSION.zip" <<'PY'
import os, sys, zipfile
stage, out = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for root, _, names in os.walk(stage):
        for name in names:
            full = os.path.join(root, name)
            z.write(full, os.path.relpath(full, stage))
PY
fi

rm -rf "$STAGE_DIR"
ZIP_PATH="$OUT_DIR/qr-studio-$VERSION.zip"

echo
echo "Built $ZIP_PATH ($(du -h "$ZIP_PATH" | cut -f1))"
echo "Shipped files:"
for file in "${FILES[@]}"; do echo "  $file"; done
echo
echo "Upload this file at https://chrome.google.com/webstore/devconsole"
