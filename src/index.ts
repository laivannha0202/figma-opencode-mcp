#!/usr/bin/env node

/**
 * figma-opencode-mcp — Entry point.
 *
 * Starts the WebSocket bridge server for Figma plugin communication,
 * then starts the MCP stdio server for OpenCode/Codex integration.
 *
 * Supports --version and --help flags.
 * All debug/info/warn/error output goes to stderr. stdout is reserved
 * exclusively for MCP JSON-RPC messages.
 */

import { rootLogger as logger } from "./shared/logger.js";
import {
  DEFAULT_BRIDGE_HOST,
  DEFAULT_BRIDGE_PORT,
  SERVER_NAME,
  SERVER_VERSION,
} from "./shared/protocol.js";
import { WsBridgeServer } from "./bridge/ws-server.js";
import { BridgeClient } from "./bridge/bridge-client.js";
import { FigmaMcpServer } from "./mcp/server.js";

// ─── CLI flags ──────────────────────────────────────────────────────────

function printVersion(): void {
  console.error(`${SERVER_NAME} v${SERVER_VERSION}`);
}

function printHelp(): void {
  console.error(`${SERVER_NAME} v${SERVER_VERSION}`);
  console.error("");
  console.error("Local-first MCP server for OpenCode/Codex that connects AI coding");
  console.error("agents to the currently open Figma file through a local plugin bridge.");
  console.error("");
  console.error("Usage:");
  console.error("  figma-opencode-mcp            Start MCP stdio server (default)");
  console.error("  figma-opencode-mcp --version   Print version and exit");
  console.error("  figma-opencode-mcp --help      Print this help and exit");
  console.error("");
  console.error("Options:");
  console.error("  --version    Show version number");
  console.error("  --help       Show this help message");
  console.error("");
  console.error("Environment variables:");
  console.error("  FIGMA_BRIDGE_HOST    WebSocket bridge host (default: 127.0.0.1)");
  console.error("  FIGMA_BRIDGE_PORT    WebSocket bridge port (default: 3845)");
  console.error("");
  console.error("What it does:");
  console.error("  - starts MCP stdio server for AI agent integration");
  console.error("  - starts local WebSocket bridge on 127.0.0.1:3845");
  console.error("  - no Figma API token required in default mode");
  console.error("  - no Figma REST API used in default mode");
  console.error("");
  console.error("Plugin setup:");
  console.error("  1. Build the plugin: npm run build:plugin");
  console.error("  2. In Figma: Plugins → Development → Import plugin from manifest");
  console.error("  3. Select plugin/manifest.json");
  console.error("  4. Run the plugin in your Figma file");
  console.error("");
  console.error("Docs: https://github.com/opencode-ai/figma-opencode-mcp");
}

const args = process.argv.slice(2);
if (args.includes("--version") || args.includes("-v")) {
  printVersion();
  process.exit(0);
}
if (args.includes("--help") || args.includes("-h")) {
  printHelp();
  process.exit(0);
}

// ─── Allowed bridge hosts (strict localhost only) ─────────────────────

const ALLOWED_BRIDGE_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

const LAN_IP_PATTERNS = [
  /^0\.0\.0\.0$/,
  /^10\./, // 10.x.x.x
  /^172\.(1[6-9]|2\d|3[01])\./, // 172.16-31.x.x
  /^192\.168\./, // 192.168.x.x
  /^100\.([6-9]\d|1[0-2]\d)\./, // Carrier-grade NAT 100.64-127.x.x
];

function isHostAllowed(host: string): boolean {
  if (ALLOWED_BRIDGE_HOSTS.has(host)) return true;
  for (const pattern of LAN_IP_PATTERNS) {
    if (pattern.test(host)) return false;
  }
  // Reject any numeric IP that isn't 127.0.0.1, localhost, or ::1
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return false;
  return ALLOWED_BRIDGE_HOSTS.has(host);
}

// ─── Config ─────────────────────────────────────────────────────────────

interface Config {
  bridgeHost: string;
  bridgePort: number;
}

function loadConfig(): Config {
  const host = process.env.FIGMA_BRIDGE_HOST ?? DEFAULT_BRIDGE_HOST;

  if (!isHostAllowed(host)) {
    console.error(
      `[figma-opencode-mcp] FATAL: Bridge host "${host}" is not allowed. ` +
        `Only 127.0.0.1, localhost, and ::1 are permitted for security. ` +
        `FIGMA_BRIDGE_HOST cannot be set to 0.0.0.0 or any LAN IP.`,
    );
    process.exit(1);
  }

  return {
    bridgeHost: host,
    bridgePort: Number(process.env.FIGMA_BRIDGE_PORT) || DEFAULT_BRIDGE_PORT,
  };
}

// ─── Main ───────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const config = loadConfig();

  logger.info(`Starting ${SERVER_NAME} v${SERVER_VERSION}...`);
  logger.info(`Bridge config: ws://${config.bridgeHost}:${config.bridgePort}`);

  // 1. Start WebSocket bridge server
  const bridgeWs = new WsBridgeServer({
    host: config.bridgeHost,
    port: config.bridgePort,
  });

  await bridgeWs.start();

  // 2. Create bridge client (request/response abstraction)
  const bridgeClient = new BridgeClient(bridgeWs);

  // 3. Create and start MCP server (stdio)
  const mcpServer = new FigmaMcpServer(bridgeClient);
  await mcpServer.start();

  logger.info("figma-opencode-mcp is ready");
  logger.info("Open Figma → run the plugin → call figma_ping from OpenCode/Codex");

  // ─── Graceful shutdown ──────────────────────────────────────────────

  function shutdown(signal: string): void {
    logger.info(`Received ${signal}, shutting down...`);
    mcpServer
      .close()
      .catch((err) => logger.error("Error closing MCP server:", err))
      .finally(() => {
        bridgeWs
          .stop()
          .catch((err) => logger.error("Error stopping bridge:", err))
          .finally(() => {
            logger.info("Shutdown complete");
            process.exit(0);
          });
      });
  }

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  // Prevent unhandled rejections from crashing the process silently
  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled rejection:", reason);
  });

  process.on("uncaughtException", (err) => {
    logger.error("Uncaught exception:", err);
  });
}

main().catch((err) => {
  logger.error("Fatal error:", err);
  process.exit(1);
});
