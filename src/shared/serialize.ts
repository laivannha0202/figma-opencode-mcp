/**
 * Serialization helpers for Figma plugin.
 *
 * NOTE: This file contains shared type definitions used by both the MCP server
 * and the plugin. The actual serializeNode function runs inside the Figma plugin
 * (plugin/code.ts) where the Figma Plugin API is available.
 *
 * The types defined here document the shape of serialized node data that flows
 * across the bridge.
 */

// ─── Serialized node shape ──────────────────────────────────────────────

export interface SerializedNode {
  id: string;
  name: string;
  type: string;
  visible?: boolean;
  locked?: boolean;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  opacity?: number;
  fills?: unknown;
  strokes?: unknown;
  strokeWeight?: number;
  cornerRadius?: number | string;
  layoutMode?: string;
  primaryAxisSizingMode?: string;
  counterAxisSizingMode?: string;
  itemSpacing?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  constraints?: unknown;
  characters?: string;
  fontSize?: number;
  fontName?: unknown;
  textAlignHorizontal?: string;
  textAlignVertical?: string;
  children?: SerializedNode[];
}

// ─── Serialize options ──────────────────────────────────────────────────

export interface SerializeOptions {
  maxDepth?: number;
  includeInvisible?: boolean;
}

export const DEFAULT_SERIALIZE_MAX_DEPTH = 5;
