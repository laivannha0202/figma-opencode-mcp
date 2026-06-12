# Setup for Codex CLI

## Prerequisites

- Node.js >= 18
- npm
- Figma desktop app
- Codex CLI

## Install & Build

```bash
git clone <repo-url> figma-opencode-mcp
cd figma-opencode-mcp
npm install
npm run build
```

## Configure Codex MCP

Codex CLI supports MCP via its configuration mechanism. Add the following to your Codex MCP config file:

```json
{
  "mcpServers": {
    "figma-opencode-mcp": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/figma-opencode-mcp/dist/index.js"]
    }
  }
}
```

Replace `/ABSOLUTE/PATH/TO/figma-opencode-mcp` with the actual absolute path on your machine.

### Example

If you cloned to `/Users/me/projects/figma-opencode-mcp`:

```json
{
  "mcpServers": {
    "figma-opencode-mcp": {
      "command": "node",
      "args": ["/Users/me/projects/figma-opencode-mcp/dist/index.js"]
    }
  }
}
```

## Verify

1. Start the MCP server:
   ```bash
   cd figma-opencode-mcp
   npm run dev
   ```

2. In a Codex session, try:
   ```
   call figma_ping
   ```

## Troubleshooting

- **MCP server not starting**: Check Node.js version >= 18.
- **Plugin not connecting**: See the main README for Figma plugin setup instructions.
- **Port conflict**: By default the bridge uses port 3845. Set `FIGMA_BRIDGE_PORT` env var to change it.
