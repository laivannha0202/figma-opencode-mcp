/**
 * Shared protocol types between MCP server and Figma plugin bridge.
 *
 * Communication flow:
 *   MCP server → WebSocket → Plugin UI → postMessage → Plugin main (code.ts)
 *   Plugin main → postMessage → Plugin UI → WebSocket → MCP server
 */

// ─── Request from MCP Server → Plugin ───────────────────────────────────

export interface BridgeRequest {
  type: "request";
  request_id: string;
  tool: string;
  params: unknown;
}

// ─── Response from Plugin → MCP Server ──────────────────────────────────

export interface BridgeResponse {
  type: "response";
  request_id: string;
  ok: boolean;
  result?: unknown;
  error?: BridgeError;
}

export interface BridgeError {
  code: string;
  message: string;
  details?: unknown;
}

// ─── Hello / status message from Plugin → MCP Server on connect ─────────

export interface BridgeHello {
  type: "hello";
  plugin: "figma-opencode-mcp-plugin";
  version: "0.2.1";
  figma?: {
    editorType?: string;
    fileName?: string;
    currentPageName?: string;
  };
}

// ─── Disconnect message ──────────────────────────────────────────────────

export interface BridgeDisconnect {
  type: "disconnect";
  reason?: string;
}

// ─── Union type for messages from Plugin → MCP Server ───────────────────

export type BridgeIncomingMessage = BridgeResponse | BridgeHello | BridgeDisconnect;

// ─── Union type for messages from MCP Server → Plugin ───────────────────

export type BridgeOutgoingMessage = BridgeRequest;

// ─── Utility: validate incoming message shape ───────────────────────────

export function isBridgeIncomingMessage(data: unknown): data is BridgeIncomingMessage {
  if (typeof data !== "object" || data === null) return false;
  const msg = data as Record<string, unknown>;
  if (msg.type === "response") {
    return typeof msg.request_id === "string" && typeof msg.ok === "boolean";
  }
  if (msg.type === "hello") {
    return msg.plugin === "figma-opencode-mcp-plugin";
  }
  if (msg.type === "disconnect") {
    return true;
  }
  return false;
}

// ─── Tool names supported in v0.1.0 ─────────────────────────────────────

export const SUPPORTED_TOOLS = [
  "figma_ping",
  "figma_get_selection",
  "figma_get_current_page",
  "figma_get_node_tree",
  "figma_export_selection_json",
  "figma_create_frame",
  "figma_create_text",
  "figma_audit_selection",
] as const;

export type SupportedTool = (typeof SUPPORTED_TOOLS)[number];

export const DEFAULT_BRIDGE_HOST = "127.0.0.1";
export const DEFAULT_BRIDGE_PORT = 3845;
export const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;
export const SERVER_NAME = "figma-opencode-mcp";
export const SERVER_VERSION = "0.2.1";
