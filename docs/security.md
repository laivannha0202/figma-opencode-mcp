# Security

## Design Principles

- **No Figma API token required** in default mode.
- **No Figma REST API** in default mode.
- **No data leaves your machine** — all communication is local.
- **No external network calls** at runtime.
- **No secrets or credentials** stored or transmitted.

## Network

- MCP server binds WebSocket bridge only to `127.0.0.1` (localhost).
- WebSocket is **not** exposed on `0.0.0.0`.
- Only connections from localhost are accepted by the bridge.
- The MCP server uses stdio transport (no HTTP server for MCP).
- No outbound network connections are made at runtime.
- The Figma plugin connects to `ws://127.0.0.1:3845` only.

## Data

- Design data (node trees, selections, styles) **never leaves your machine**.
- No design data is sent to external servers.
- No telemetry, analytics, or crash reporting.
- Debug logs go to stderr only — never to stdout (reserved for MCP protocol).
- Full design JSON is not logged by default.

## Plugin

- The Figma plugin only accesses the currently open file.
- Plugin access is limited to what Figma Plugin API permits.
- The plugin cannot access files that are not open in Figma.
- No eval or dynamic code execution in the bridge server.
- Plugin manifest declares `networkAccess.allowedDomains` restricted to `ws://127.0.0.1`.

## Supply Chain

- Dependencies are locked via `package-lock.json` (commit it to repo).
- Semver ranges in `package.json` are pinned to exact versions by the lockfile.
- Only required runtime dependencies: `@modelcontextprotocol/sdk`, `zod`, `ws`.
- No shell execution from tool parameters.
- No `child_process.exec` with untrusted input.
- No `child_process.spawn` with string command injection.
- npm package `files` field in `package.json` limits published contents to only required directories (`dist`, `plugin`, `docs`, `examples`, `README.md`, `LICENSE`).
- Source TypeScript files (`src/`) are excluded from the npm package to reduce supply-chain surface.
- `prepack` script runs `build` and `build:plugin` to ensure the package contains only compiled artifacts.

## Future: Advanced / API Mode

If a future version adds an advanced mode that uses Figma REST API:

- It will be **opt-in only**.
- It will require explicit user configuration.
- It will clearly document that a Figma Personal Access Token is needed.
- Token storage will follow security best practices.
- The default no-token local bridge mode will remain unchanged.
