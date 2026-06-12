# Setup for OpenCode

## Recommended: Install with npx

Run the MCP server directly without cloning the repo:

```bash
opencode mcp add figma-opencode-mcp -- npx -y figma-opencode-mcp@latest
```

This adds the MCP server to your OpenCode configuration automatically.

## Alternative: Local clone

### Prerequisites

- Node.js >= 18
- npm
- Figma desktop app
- OpenCode CLI

### Install & Build

```bash
git clone <repo-url> figma-opencode-mcp
cd figma-opencode-mcp
npm install
npm run build
```

### Configure OpenCode MCP

Add the following to your OpenCode configuration file (typically `~/.config/opencode/opencode.json` or project-level `opencode.json`):

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

If you cloned to `/home/user/projects/figma-opencode-mcp`:

```json
{
  "mcpServers": {
    "figma-opencode-mcp": {
      "command": "node",
      "args": ["/home/user/projects/figma-opencode-mcp/dist/index.js"]
    }
  }
}
```

## Verify

1. Start the MCP server:

   ```bash
   # If using npx:
   npx -y figma-opencode-mcp@latest

   # If using local clone:
   cd figma-opencode-mcp && npm run dev
   ```

2. In another terminal, verify OpenCode can see the MCP server:

   ```bash
   opencode mcp list
   ```

3. Open Figma, run the plugin (see Figma plugin setup), then try:
   ```bash
   opencode prompt "call figma_ping"
   ```

## Troubleshooting

- **MCP server not showing up**: Check your config path is absolute and points to `dist/index.js` (not `src/index.ts`).
- **Connection refused**: Ensure the MCP server is running before starting OpenCode.
- **Plugin not connected**: Open Figma, run the plugin manually. The plugin auto-connects to `ws://127.0.0.1:3845`.
