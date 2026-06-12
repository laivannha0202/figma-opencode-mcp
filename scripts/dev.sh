#!/bin/bash
set -euo pipefail

# figma-opencode-mcp — Development server
cd "$(dirname "$0")/.."
echo "Starting figma-opencode-mcp dev server..."
npm run dev
