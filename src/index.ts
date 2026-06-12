#!/usr/bin/env node

/**
 * figma-opencode-mcp — Entry point.
 *
 * Starts the WebSocket bridge server for Figma plugin communication,
 * then starts the MCP stdio server for OpenCode/Codex integration.
 *
 * All debug/info/warn/error output goes to stderr. stdout is reserved
 * exclusively for MCP JSON-RPC messages.
 */

import { rootLogger as logger } from "./shared/logger.js";
import { DEFAULT_BRIDGE_HOST, DEFAULT_BRIDGE_PORT } from "./shared/protocol.js";
import { WsBridgeServer } from "./bridge/ws-server.js";
import { BridgeClient } from "./bridge/bridge-client.js";
import { FigmaMcpServer } from "./mcp/server.js";

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

  logger.info(`Starting figma-opencode-mcp v0.1.1...`);
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
