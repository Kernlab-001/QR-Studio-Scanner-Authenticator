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

if [ -z "$VERSION" ]; then
  echo "error: could not read the version from manifest.json" >&2
  exit 1
fi

echo "manifest.json OK - version $VERSION"

# --- collect the files to ship ------------------------------------------------
FILES=(manifest.json popup.html popup.css popup.js jsqr.js qrcode-generator.js)
if [ -d icons ]; then
  while IFS= read -r icon; do
    FILES+=("icons/$(basename "$icon")")
  done < <(find icons -maxdepth 1 -name '*.png' | sort)
fi
# The vendored browser-side libraries, including the WebAssembly decoder, are
# shipped inside the package.
if [ -d vendor ]; then
  while IFS= read -r vendored; do
    FILES+=("vendor/${vendored#vendor/}")
  done < <(find vendor -type f | sort)
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
  # zip on Unix writes forward-slash entry names, which is what the Web
  # Store's unpacker expects.
  (cd "$STAGE_DIR" && zip -qr "../qr-studio-$VERSION.zip" .)
elif command -v python3 >/dev/null 2>&1; then
  python3 - "$STAGE_DIR" "qr-studio-$VERSION.zip" <<'PY'
import os, sys, zipfile
stage, out = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for root, _, names in os.walk(stage):
        for name in names:
            full = os.path.join(root, name)
            z.write(full, os.path.relpath(full, stage))
PY
else
  echo "error: neither 'zip' nor 'python3' is available to build the archive" >&2
  exit 1
fi

rm -rf "$STAGE_DIR"
ZIP_PATH="$OUT_DIR/qr-studio-$VERSION.zip"

# --- verify the archive --------------------------------------------------------
# The Web Store unpacks on Linux, so an entry stored as "icons\icon16.png"
# would be seen as a single odd file name instead of a folder. Catch that
# here rather than after an upload is rejected.
verify_zip() {
  if command -v unzip >/dev/null 2>&1; then
    local names
    names="$(unzip -Z1 "$ZIP_PATH")"
    if ! printf '%s\n' "$names" | grep -qx 'manifest.json'; then
      echo "error: manifest.json is not at the root of the zip" >&2
      return 1
    fi
    if printf '%s\n' "$names" | grep -q '\\'; then
      echo "error: zip entries must use forward slashes, not backslashes" >&2
      return 1
    fi
    echo "Zip verified - manifest.json at root, $(printf '%s\n' "$names" | wc -l | tr -d ' ') entries"
  elif command -v python3 >/dev/null 2>&1; then
    python3 - "$ZIP_PATH" <<'PY'
import sys, zipfile
with zipfile.ZipFile(sys.argv[1]) as z:
    names = z.namelist()
if "manifest.json" not in names:
    raise SystemExit("error: manifest.json is not at the root of the zip")
bad = [n for n in names if "\\" in n]
if bad:
    raise SystemExit("error: zip entries must use forward slashes: " + ", ".join(bad))
print("Zip verified - manifest.json at root,", len(names), "entries")
PY
  else
    echo "warning: no 'unzip' or 'python3' available, skipping the archive check" >&2
  fi
}

verify_zip

echo
echo "Built $ZIP_PATH ($(du -h "$ZIP_PATH" | cut -f1))"
echo "Shipped files:"
for file in "${FILES[@]}"; do echo "  $file"; done
echo
echo "Upload this file at https://chrome.google.com/webstore/devconsole"
