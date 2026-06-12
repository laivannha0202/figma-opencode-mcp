# figma-opencode-mcp

**Local-first MCP server for OpenCode/Codex** that connects AI coding agents to the currently open Figma file through a local plugin bridge.

> No Figma API token required. No Figma REST API in default mode. All communication stays on your machine.

**Version: v0.2.0** — npm packaging release. Run with a single `npx` command.

## Key Features

- 🔌 **No Figma API token required** in default mode
- 🔒 **No data leaves your machine** — local WebSocket bridge
- 📐 **Read current selection** — get node data from Figma
- 📋 **Export selection as JSON** — structured data for design-to-code
- ✏️ **Create frames and text** — basic write operations
- 🔍 **Audit selection** — design system heuristics (spacing, typography, layout)
- 🧩 **Works with OpenCode and Codex** via MCP stdio transport
- 📦 **Run with a single `npx` command** — no clone or install needed

## Important Limitations

> ⚠️ This does **not** magically access any private Figma file by URL.
>
> - You still need to **open the Figma file** in Figma.
> - You must **run the local plugin bridge** inside the file.
> - The plugin can only access what Figma Plugin API allows in the current file/session.

## Architecture

```
OpenCode/Codex → MCP stdio → WebSocket (127.0.0.1:3845) → Plugin UI → Plugin Main → Figma API
```

See [docs/architecture.md](docs/architecture.md) for details.

## Quick Start

### Option A: Install with npx (recommended)

Run the MCP server directly — no clone or local build needed:

```bash
npx -y figma-opencode-mcp@latest
```

#### Configure OpenCode/Codex

**OpenCode:**

```bash
opencode mcp add figma-opencode-mcp -- npx -y figma-opencode-mcp@latest
```

**Codex:**

```bash
codex mcp add figma-opencode-mcp -- npx -y figma-opencode-mcp@latest
```

**.mcp.json (any MCP client):**

```json
{
  "mcpServers": {
    "figma-opencode-mcp": {
      "command": "npx",
      "args": ["-y", "figma-opencode-mcp@latest"]
    }
  }
}
```

> **Note:** The npm/npx command only installs the MCP server.
> You still need to import and run the Figma plugin separately (see step 4).

### Option B: Local clone (for development)

```bash
git clone <repo-url> figma-opencode-mcp
cd figma-opencode-mcp
npm install
npm run build
```

**Start MCP Server:**

```bash
# Development mode (hot reload)
npm run dev

# Production mode
node dist/index.js
```

**Local MCP config:**

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

### 4. Run Figma Plugin (required for both options)

1. Build the plugin: `npm run build:plugin` (skip if using npx — download the plugin from [releases](https://github.com/opencode-ai/figma-opencode-mcp/releases))
2. In Figma: **Plugins → Development → Import plugin from manifest**
3. Select `plugin/manifest.json`
4. Run the plugin in your Figma file
5. The plugin will connect to `ws://127.0.0.1:3845`
6. Back in OpenCode/Codex, call `figma_ping`

## Tools

| Tool                          | Description               |
| ----------------------------- | ------------------------- |
| `figma_ping`                  | Check connection status   |
| `figma_get_selection`         | Get selected nodes        |
| `figma_get_current_page`      | Get current page info     |
| `figma_get_node_tree`         | Get node tree             |
| `figma_export_selection_json` | Export as structured JSON |
| `figma_create_frame`          | Create a frame            |
| `figma_create_text`           | Create a text node        |
| `figma_audit_selection`       | Audit for design issues   |

See [docs/tools.md](docs/tools.md) for detailed documentation.

## Example Prompts

```
Use figma_ping to check connection.
Use figma_get_selection to read my current selected frame.
Use figma_export_selection_json and generate a React/Vite component.
Use figma_audit_selection and suggest design-system improvements.
```

## Project Structure

```
figma-opencode-mcp/
├── src/                  # MCP server source
│   ├── index.ts          # Entry point
│   ├── mcp/              # MCP layer (server, tools, schemas, handlers)
│   ├── bridge/           # WebSocket bridge (WS server, client, pending requests)
│   └── shared/           # Shared types (protocol, errors, logger, serialize)
├── plugin/               # Figma plugin (manifest, code, UI, types)
├── docs/                 # Documentation
├── examples/             # MCP config examples
├── scripts/              # Dev/build/verify scripts
└── README.md
```

## Security

- No token, no REST API in default mode.
- WebSocket binds only to `127.0.0.1`.
- No data sent to external servers.
- No eval or shell execution.
- No `.env` with secrets.

See [docs/security.md](docs/security.md).

## Roadmap

### v0.2.0 ✅

- npm package packaging with `npx` support
- `--version` and `--help` CLI flags
- Plugin packaging (`plugin.zip`)
- Documentation updates for npx install

### v0.3.0

- `figma_extract_design_tokens`
- `figma_generate_react_spec`
- `figma_compare_code_with_design`
- `figma_create_component`
- `figma_apply_auto_layout`
- `figma_export_svg_png`

### v0.4.0

- Integration profile for `opencode-power-kit`
- `/figma-setup` slash command
- `/figma-to-react` workflow
- `/figma-audit` workflow
- `figma-design-system` skill

### v1.0.0

- Stable no-token local bridge
- Better plugin session management
- Better schema docs

## License

MIT
