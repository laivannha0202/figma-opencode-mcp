/**
 * Zod schemas for all MCP tool inputs.
 *
 * Using zod v4 (classic/v3-compatible syntax).
 * The MCP SDK accepts ZodRawShapeCompat = Record<string, AnySchema>.
 */

import { z } from "zod";

// ─── figma_ping ─────────────────────────────────────────────────────────

export const PingSchema = z.object({}).optional();

// ─── figma_get_selection ────────────────────────────────────────────────

export const GetSelectionSchema = z.object({
  includeChildren: z.boolean().optional().describe("Include children recursively"),
  maxDepth: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional()
    .describe("Max depth for children (default: 3)"),
});

// ─── figma_get_current_page ────────────────────────────────────────────

export const GetCurrentPageSchema = z.object({}).optional();

// ─── figma_get_node_tree ───────────────────────────────────────────────

export const GetNodeTreeSchema = z.object({
  nodeId: z.string().optional().describe("Node ID to start from (default: current page)"),
  maxDepth: z.number().int().min(1).max(10).optional().describe("Max depth (default: 5)"),
  includeInvisible: z.boolean().optional().describe("Include invisible nodes"),
});

// ─── figma_export_selection_json ────────────────────────────────────────

export const ExportSelectionJsonSchema = z.object({
  includeStyle: z.boolean().optional().describe("Include style properties"),
  includeLayout: z.boolean().optional().describe("Include layout properties"),
  includeChildren: z.boolean().optional().describe("Include children recursively"),
  maxDepth: z.number().int().min(1).max(10).optional().describe("Max depth (default: 5)"),
});

// ─── figma_create_frame ────────────────────────────────────────────────

export const CreateFrameSchema = z.object({
  name: z.string().min(1).max(200).describe("Frame name"),
  x: z.number().optional().describe("X position (default: 0)"),
  y: z.number().optional().describe("Y position (default: 0)"),
  width: z.number().positive().describe("Frame width in pixels"),
  height: z.number().positive().describe("Frame height in pixels"),
  fill: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Fill must be hex format #RRGGBB")
    .optional()
    .describe("Background fill color in hex"),
  cornerRadius: z.number().min(0).optional().describe("Corner radius"),
});

// ─── figma_create_text ─────────────────────────────────────────────────

export const CreateTextSchema = z.object({
  text: z.string().min(1).max(10000).describe("Text content"),
  name: z.string().max(200).optional().describe("Node name (default: text content preview)"),
  x: z.number().optional().describe("X position (default: 0)"),
  y: z.number().optional().describe("Y position (default: 0)"),
  fontSize: z.number().positive().optional().describe("Font size in px (default: 16)"),
  fill: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Fill must be hex format #RRGGBB")
    .optional()
    .describe("Text fill color in hex"),
});

// ─── figma_audit_selection ─────────────────────────────────────────────

export const AuditSelectionSchema = z.object({
  checkSpacing: z.boolean().optional().describe("Check spacing issues"),
  checkColors: z.boolean().optional().describe("Check color consistency"),
  checkTypography: z.boolean().optional().describe("Check typography issues"),
  checkAutoLayout: z.boolean().optional().describe("Check auto-layout usage"),
  checkAccessibility: z.boolean().optional().describe("Check accessibility issues"),
});

// ─── Registry of all schemas ───────────────────────────────────────────

export const ALL_TOOL_SCHEMAS = {
  figma_ping: PingSchema,
  figma_get_selection: GetSelectionSchema,
  figma_get_current_page: GetCurrentPageSchema,
  figma_get_node_tree: GetNodeTreeSchema,
  figma_export_selection_json: ExportSelectionJsonSchema,
  figma_create_frame: CreateFrameSchema,
  figma_create_text: CreateTextSchema,
  figma_audit_selection: AuditSelectionSchema,
} as const;

export type ToolSchemaMap = typeof ALL_TOOL_SCHEMAS;
