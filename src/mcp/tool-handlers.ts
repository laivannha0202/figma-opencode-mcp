/**
 * MCP tool handlers.
 *
 * Each handler receives validated params and returns a result object.
 * Tools requiring Figma interaction delegate to BridgeClient.
 */

import { McpError, pluginNotConnectedError } from "../shared/errors.js";
import { SERVER_NAME, SERVER_VERSION } from "../shared/protocol.js";
import type { BridgeClient } from "../bridge/bridge-client.js";
import type { BridgeHello } from "../shared/protocol.js";
import { rootLogger } from "../shared/logger.js";

const logger = rootLogger;

// ─── Handler helper types ──────────────────────────────────────────────

export type ToolHandler = (
  params: Record<string, unknown> | undefined,
) => Promise<unknown>;

export interface HandlerContext {
  bridgeClient: BridgeClient;
}

// ─── figma_ping ─────────────────────────────────────────────────────────

async function handlePing(ctx: HandlerContext) {
  const hello = ctx.bridgeClient.pluginHello;
  return {
    ok: ctx.bridgeClient.pluginConnected,
    server: SERVER_NAME,
    version: SERVER_VERSION,
    bridge: {
      host: "127.0.0.1",
      port: 3845,
      pluginConnected: ctx.bridgeClient.pluginConnected,
    },
    message: ctx.bridgeClient.pluginConnected
      ? undefined
      : "MCP server is running, but the Figma plugin is not connected. Open Figma, run the plugin, then try again.",
  };
}

// ─── figma_get_selection ────────────────────────────────────────────────

async function handleGetSelection(
  ctx: HandlerContext,
  params: Record<string, unknown> | undefined,
) {
  const result = await ctx.bridgeClient.request("figma_get_selection", params ?? {});
  return result;
}

// ─── figma_get_current_page ─────────────────────────────────────────────

async function handleGetCurrentPage(
  ctx: HandlerContext,
  _params: Record<string, unknown> | undefined,
) {
  const result = await ctx.bridgeClient.request("figma_get_current_page", {});
  return result;
}

// ─── figma_get_node_tree ────────────────────────────────────────────────

async function handleGetNodeTree(
  ctx: HandlerContext,
  params: Record<string, unknown> | undefined,
) {
  const result = await ctx.bridgeClient.request("figma_get_node_tree", params ?? {});
  return result;
}

// ─── figma_export_selection_json ────────────────────────────────────────

async function handleExportSelectionJson(
  ctx: HandlerContext,
  params: Record<string, unknown> | undefined,
) {
  const result = await ctx.bridgeClient.request("figma_export_selection_json", params ?? {});
  return result;
}

// ─── figma_create_frame ─────────────────────────────────────────────────

async function handleCreateFrame(
  ctx: HandlerContext,
  params: Record<string, unknown>,
) {
  const result = await ctx.bridgeClient.request("figma_create_frame", params);
  return result;
}

// ─── figma_create_text ──────────────────────────────────────────────────

async function handleCreateText(
  ctx: HandlerContext,
  params: Record<string, unknown>,
) {
  const result = await ctx.bridgeClient.request("figma_create_text", params);
  return result;
}

// ─── figma_audit_selection ──────────────────────────────────────────────

async function handleAuditSelection(
  ctx: HandlerContext,
  params: Record<string, unknown> | undefined,
) {
  const result = await ctx.bridgeClient.request("figma_audit_selection", params ?? {});
  return result;
}

// ─── Handler map ────────────────────────────────────────────────────────

export type HandlerMap = Record<string, ToolHandler>;

export function createHandlers(ctx: HandlerContext): HandlerMap {
  return {
    figma_ping: () => handlePing(ctx),
    figma_get_selection: (p) => handleGetSelection(ctx, p),
    figma_get_current_page: (p) => handleGetCurrentPage(ctx, p),
    figma_get_node_tree: (p) => handleGetNodeTree(ctx, p),
    figma_export_selection_json: (p) => handleExportSelectionJson(ctx, p),
    figma_create_frame: (p) => handleCreateFrame(ctx, p as Record<string, unknown>),
    figma_create_text: (p) => handleCreateText(ctx, p as Record<string, unknown>),
    figma_audit_selection: (p) => handleAuditSelection(ctx, p),
  };
}
