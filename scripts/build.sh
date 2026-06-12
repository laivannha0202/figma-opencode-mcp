#!/bin/bash
set -euo pipefail

# figma-opencode-mcp — Build
cd "$(dirname "$0")/.."
echo "Building figma-opencode-mcp..."

npm run build
# npm run build:plugin  # Uncomment when plugin build is ready

echo "✅ Build complete"
