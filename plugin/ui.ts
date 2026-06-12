/**
 * Figma OpenCode MCP Bridge — Plugin UI TypeScript types.
 *
 * This file documents the message types flowing between the plugin UI
 * and the plugin main code (code.ts), as well as the UI ↔ WebSocket bridge.
 *
 * In v0.1.0, the UI logic is inlined in ui.html for simplicity.
 * This file serves as type reference and can be compiled for stricter builds.
 *
 * Communication flow:
 *   WebSocket ← → UI (inline JS in ui.html) ← postMessage → Plugin main (code.ts)
 */

// ─── Messages from UI → Plugin main ─────────────────────────────────────

export interface UIMessage {
  type: "request";
  request_id: string;
  tool: string;
  params: unknown;
}

// ─── Messages from Plugin main → UI ─────────────────────────────────────

export interface PluginResponse {
  type: "response";
  request_id: string;
  ok: boolean;
  result?: unknown;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// ─── WebSocket messages (UI → MCP server) ──────────────────────────────

export interface BridgeHello {
  type: "hello";
  plugin: "figma-opencode-mcp-plugin";
  version: "0.1.0";
}

export type WSOutgoingMessage = PluginResponse | BridgeHello;
