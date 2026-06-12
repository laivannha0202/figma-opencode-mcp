#!/bin/bash
set -euo pipefail

# figma-opencode-mcp — Verify build, typecheck, and file existence
cd "$(dirname "$0")/.."

echo "=== figma-opencode-mcp verify ==="
echo ""

FAILED=0

# 1. TypeScript typecheck
echo "--- TypeScript typecheck ---"
if ! npm run typecheck 2>&1; then
  echo "❌ Typecheck failed"
  FAILED=1
fi
echo ""

# 2. Build MCP server
echo "--- Build MCP server ---"
if ! npm run build 2>&1; then
  echo "❌ Build failed"
  FAILED=1
fi
echo ""

# 3. Build plugin (if config exists)
if [ -f "plugin/tsconfig.json" ]; then
  echo "--- Build Figma plugin ---"
  if ! npm run build:plugin 2>&1; then
    echo "❌ Plugin build failed"
    FAILED=1
  fi
  echo ""
fi

# 4. Verify file existence
echo "--- Required files ---"
MISSING=0
for f in \
  dist/index.js \
  src/index.ts \
  src/mcp/server.ts \
  src/mcp/tools.ts \
  src/mcp/tool-schemas.ts \
  src/mcp/tool-handlers.ts \
  src/bridge/ws-server.ts \
  src/bridge/bridge-client.ts \
  src/bridge/pending-requests.ts \
  src/shared/protocol.ts \
  src/shared/errors.ts \
  src/shared/logger.ts \
  src/shared/serialize.ts \
  plugin/manifest.json \
  plugin/code.ts \
  plugin/ui.html \
  docs/architecture.md \
  docs/setup-opencode.md \
  docs/setup-codex.md \
  docs/tools.md \
  docs/security.md \
  README.md \
  LICENSE; do
  if [ -f "$f" ]; then
    echo "✅ $f"
  else
    echo "❌ $f — MISSING"
    MISSING=$((MISSING+1))
    FAILED=1
  fi
done

echo ""
if [ "$MISSING" -eq 0 ]; then
  echo "✅ All required files present"
else
  echo "❌ $MISSING file(s) missing"
fi

echo ""
if [ "$FAILED" -eq 0 ]; then
  echo "=== Verify passed ==="
  exit 0
else
  echo "=== Verify FAILED ==="
  exit 1
fi
