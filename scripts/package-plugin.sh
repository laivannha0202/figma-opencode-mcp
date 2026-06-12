#!/bin/bash
set -euo pipefail

# figma-opencode-mcp — Package Figma plugin into a release zip
#
# Usage: bash scripts/package-plugin.sh [version]
#   version defaults to the version in package.json

cd "$(dirname "$0")/.."

VERSION="${1:-$(node -p "require('./package.json').version")}"
OUTDIR="release"
OUTFILE="${OUTDIR}/figma-opencode-mcp-plugin-v${VERSION}.zip"

echo "=== Packaging Figma plugin v${VERSION} ==="

# Ensure plugin is built
if [ ! -f "plugin/dist/code.js" ]; then
  echo "Plugin not built. Running build:plugin..."
  npm run build:plugin
fi

# Verify required files
MISSING=0
for f in \
  plugin/manifest.json \
  plugin/ui.html \
  plugin/dist/code.js; do
  if [ -f "$f" ]; then
    echo "✅ $f"
  else
    echo "❌ $f — MISSING"
    MISSING=$((MISSING+1))
  fi
done

if [ "$MISSING" -gt 0 ]; then
  echo "❌ ${MISSING} file(s) missing. Aborting."
  exit 1
fi

# Create output directory
mkdir -p "${OUTDIR}"

# Remove old zip if exists
rm -f "${OUTFILE}"

# Create zip with plugin files (preserving directory structure)
cd plugin
zip -r "../${OUTFILE}" \
  manifest.json \
  ui.html \
  dist/code.js \
  dist/ui.js \
  2>&1 > /dev/null
cd ..

echo "✅ Created ${OUTFILE}"
echo ""
echo "Plugin zip contents:"
unzip -l "${OUTFILE}" | head -20
echo ""
echo "To use:"
echo "  1. Unzip to a local directory"
echo "  2. In Figma: Plugins → Development → Import plugin from manifest"
echo "  3. Select the extracted manifest.json"
echo ""
echo "Or share the zip with your team for easy Figma plugin installation."
