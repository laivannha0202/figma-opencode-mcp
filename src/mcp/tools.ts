/**
 * Tool definitions for MCP server registration.
 *
 * Each tool has a name, description, and input schema reference.
 * Used by src/mcp/server.ts to register all tools.
 */

import { SUPPORTED_TOOLS, type SupportedTool } from "../shared/protocol.js";

// ─── Tool descriptor ────────────────────────────────────────────────────

export interface ToolDescriptor {
  name: SupportedTool;
  description: string;
}

// ─── All tool descriptors ───────────────────────────────────────────────

export const TOOL_DESCRIPTORS: ToolDescriptor[] = [
  {
    name: "figma_ping",
    description: "Check if the MCP server is alive and the Figma plugin bridge is connected.",
  },
  {
    name: "figma_get_selection",
    description: "Get the list of currently selected nodes in the active Figma file.",
  },
  {
    name: "figma_get_current_page",
    description: "Get information about the current page in the active Figma file.",
  },
  {
    name: "figma_get_node_tree",
    description: "Get the node tree starting from the current page or a specific node.",
  },
  {
    name: "figma_export_selection_json",
    description:
      "Export the current selection as structured JSON (geometry, layout, typography, colors, spacing, auto layout).",
  },
  {
    name: "figma_create_frame",
    description: "Create a new frame node in the current page.",
  },
  {
    name: "figma_create_text",
    description: "Create a new text node in the current page.",
  },
  {
    name: "figma_audit_selection",
    description:
      "Audit the current selection for design system issues (spacing, colors, typography, auto layout, accessibility).",
  },
];
