/**
 * Figma OpenCode MCP Bridge — Plugin main code.
 *
 * Runs inside Figma, receives tool requests from the UI (which forwards
 * them from the MCP server over WebSocket), calls Figma Plugin API,
 * and sends results back.
 *
 * NOTE: This is NOT a Node.js environment. No Node APIs available.
 */

figma.showUI(__html__, { width: 320, height: 400, themeColors: true });

// ─── Types matching the bridge protocol ─────────────────────────────────

interface BridgeRequest {
  type: "request";
  request_id: string;
  tool: string;
  params: unknown;
}

interface BridgeResponse {
  type: "response";
  request_id: string;
  ok: boolean;
  result?: unknown;
  error?: { code: string; message: string; details?: unknown };
}

// ─── Serialized node shape ──────────────────────────────────────────────

interface SerializedNode {
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

// ─── UI message handling ───────────────────────────────────────────────

figma.ui.onmessage = async (msg: BridgeRequest) => {
  if (msg.type !== "request") return;

  try {
    const result = await handleToolRequest(msg.tool, msg.params);
    const response: BridgeResponse = {
      type: "response",
      request_id: msg.request_id,
      ok: true,
      result,
    };
    figma.ui.postMessage(response);
  } catch (err) {
    const response: BridgeResponse = {
      type: "response",
      request_id: msg.request_id,
      ok: false,
      error: {
        code: "PLUGIN_ERROR",
        message: err instanceof Error ? err.message : String(err),
      },
    };
    figma.ui.postMessage(response);
  }
};

// ─── Tool dispatch ──────────────────────────────────────────────────────

async function handleToolRequest(tool: string, params: unknown): Promise<unknown> {
  switch (tool) {
    case "figma_ping":
      return handlePing();
    case "figma_get_selection":
      return handleGetSelection(params as Record<string, unknown>);
    case "figma_get_current_page":
      return handleGetCurrentPage();
    case "figma_get_node_tree":
      return handleGetNodeTree(params as Record<string, unknown>);
    case "figma_export_selection_json":
      return handleExportSelectionJson(params as Record<string, unknown>);
    case "figma_create_frame":
      return handleCreateFrame(params as Record<string, unknown>);
    case "figma_create_text":
      return handleCreateText(params as Record<string, unknown>);
    case "figma_audit_selection":
      return handleAuditSelection(params as Record<string, unknown>);
    default:
      throw new Error(`Unknown tool: ${tool}`);
  }
}

// ─── Tool handlers ──────────────────────────────────────────────────────

/**
 * Serialize a Figma node to a plain JSON object safely.
 */
function serializeNode(
  node: SceneNode,
  options: {
    maxDepth?: number;
    includeInvisible?: boolean;
    includeChildren?: boolean;
    _depth?: number;
  } = {},
): SerializedNode | null {
  const { maxDepth = 5, includeInvisible = false, includeChildren = true, _depth = 0 } = options;

  if (_depth > maxDepth) return null;

  // PageNode/BaseNode may not have visible — treat as visible if absent
  const nodeVisible = "visible" in node ? node.visible : true;
  if (!includeInvisible && !nodeVisible) return null;

  const base: SceneNode = node;
  const result: SerializedNode = {
    id: base.id,
    name: base.name,
    type: base.type,
    visible: nodeVisible,
  };

  // Locked (not all nodes have it)
  if ("locked" in base) {
    result.locked = (base as unknown as Record<string, unknown>).locked as boolean;
  }

  // Geometry
  if ("x" in base) result.x = (base as unknown as Record<string, number>).x;
  if ("y" in base) result.y = (base as unknown as Record<string, number>).y;
  if ("width" in base) result.width = (base as unknown as Record<string, number>).width;
  if ("height" in base) result.height = (base as unknown as Record<string, number>).height;
  if ("rotation" in base) result.rotation = (base as unknown as Record<string, number>).rotation;
  if ("opacity" in base) result.opacity = (base as unknown as Record<string, number>).opacity;

  // Fills
  if ("fills" in base) {
    const fills = (base as unknown as Record<string, unknown>).fills;
    result.fills = serializePaintArray(fills);
  }

  // Strokes
  if ("strokes" in base) {
    const strokes = (base as unknown as Record<string, unknown>).strokes;
    result.strokes = serializePaintArray(strokes);
  }

  if ("strokeWeight" in base) {
    result.strokeWeight = (base as unknown as Record<string, number>).strokeWeight;
  }

  // Corner radius
  if ("cornerRadius" in base) {
    const cr = (base as unknown as Record<string, unknown>).cornerRadius;
    result.cornerRadius = cr === figma.mixed ? "mixed" : (cr as number);
  }

  // Auto layout
  if ("layoutMode" in base) {
    result.layoutMode = (base as unknown as Record<string, string>).layoutMode;
  }
  if ("primaryAxisSizingMode" in base) {
    result.primaryAxisSizingMode = (
      base as unknown as Record<string, string>
    ).primaryAxisSizingMode;
  }
  if ("counterAxisSizingMode" in base) {
    result.counterAxisSizingMode = (
      base as unknown as Record<string, string>
    ).counterAxisSizingMode;
  }
  if ("itemSpacing" in base)
    result.itemSpacing = (base as unknown as Record<string, number>).itemSpacing;
  if ("paddingLeft" in base)
    result.paddingLeft = (base as unknown as Record<string, number>).paddingLeft;
  if ("paddingRight" in base)
    result.paddingRight = (base as unknown as Record<string, number>).paddingRight;
  if ("paddingTop" in base)
    result.paddingTop = (base as unknown as Record<string, number>).paddingTop;
  if ("paddingBottom" in base)
    result.paddingBottom = (base as unknown as Record<string, number>).paddingBottom;

  // Constraints
  if ("constraints" in base) {
    result.constraints = (base as unknown as Record<string, unknown>).constraints;
  }

  // Text
  if (base.type === "TEXT") {
    const textNode = base as TextNode;
    result.characters = textNode.characters;
    try {
      result.fontSize = textNode.fontSize === figma.mixed ? undefined : textNode.fontSize;
    } catch {
      // ignore
    }
    try {
      result.fontName = textNode.fontName === figma.mixed ? undefined : textNode.fontName;
    } catch {
      // ignore
    }
    result.textAlignHorizontal = textNode.textAlignHorizontal;
    result.textAlignVertical = textNode.textAlignVertical;
  }

  // Children (for frames, groups, components, etc.)
  if (includeChildren && _depth < maxDepth && "children" in base) {
    const container = base as unknown as { children: SceneNode[] };
    result.children = [];
    for (const child of container.children) {
      const serialized = serializeNode(child, {
        ...options,
        _depth: _depth + 1,
      });
      if (serialized) {
        result.children.push(serialized);
      }
    }
    if (result.children.length === 0) {
      delete result.children;
    }
  }

  return result;
}

/**
 * Safely serialize paint (fills/strokes).
 */
function serializePaintArray(paints: unknown): unknown {
  if (!paints || paints === figma.mixed) return paints === figma.mixed ? "mixed" : undefined;
  if (!Array.isArray(paints)) return undefined;
  return paints.map((p) => serializeSinglePaint(p));
}

function serializeSinglePaint(paint: unknown): unknown {
  if (typeof paint !== "object" || paint === null) return paint;
  const p = paint as Record<string, unknown>;
  const result: Record<string, unknown> = { type: p.type };
  if (p.color) result.color = p.color;
  if (p.opacity !== undefined && p.opacity !== 1) result.opacity = p.opacity;
  if (p.visible !== undefined) result.visible = p.visible;
  if (p.blendMode !== undefined && p.blendMode !== "NORMAL") result.blendMode = p.blendMode;
  return result;
}

// ─── 1. figma_ping ──────────────────────────────────────────────────────

function handlePing() {
  const page = figma.currentPage;
  const fileKey = (figma as unknown as Record<string, unknown>).fileKey;
  return {
    plugin: "figma-opencode-mcp-plugin",
    version: "0.1.1",
    figma: {
      editorType: figma.editorType,
      fileKey: fileKey ?? null,
      currentPageName: page.name,
      currentPageId: page.id,
    },
  };
}

// ─── 2. figma_get_selection ─────────────────────────────────────────────

function handleGetSelection(params: Record<string, unknown>) {
  const selection = figma.currentPage.selection;
  if (selection.length === 0) {
    return { selection: [], count: 0 };
  }

  const includeChildren = params.includeChildren === true;
  const maxDepth = typeof params.maxDepth === "number" ? params.maxDepth : 3;

  const nodes = selection.map((node) => serializeNode(node, { maxDepth, includeChildren }));

  return { selection: nodes, count: nodes.length };
}

// ─── 3. figma_get_current_page ──────────────────────────────────────────

function handleGetCurrentPage() {
  const page = figma.currentPage;
  const topLevelNodes = page.children.slice(0, 50).map((n) => ({
    id: n.id,
    name: n.name,
    type: n.type,
  }));

  return {
    id: page.id,
    name: page.name,
    childCount: page.children.length,
    topLevelNodes,
  };
}

// ─── 4. figma_get_node_tree ─────────────────────────────────────────────

function handleGetNodeTree(params: Record<string, unknown>) {
  const maxDepth = typeof params.maxDepth === "number" ? params.maxDepth : 5;
  const includeInvisible = params.includeInvisible === true;
  const nodeId = params.nodeId as string | undefined;

  let root: SceneNode | PageNode;
  if (nodeId) {
    const node = figma.getNodeById(nodeId);
    if (!node) throw new Error(`Node not found: ${nodeId}`);
    root = node as SceneNode;
  } else {
    root = figma.currentPage;
  }

  return serializeNode(root as SceneNode, { maxDepth, includeInvisible, includeChildren: true });
}

// ─── 5. figma_export_selection_json ─────────────────────────────────────

function handleExportSelectionJson(params: Record<string, unknown>) {
  const selection = figma.currentPage.selection;
  if (selection.length === 0) {
    return { selection: [], count: 0, message: "Nothing selected" };
  }

  const includeStyle = params.includeStyle !== false;
  const includeLayout = params.includeLayout !== false;
  const includeChildren = params.includeChildren !== false;
  const maxDepth = typeof params.maxDepth === "number" ? params.maxDepth : 5;

  const nodes = selection.map((node) => {
    const serialized = serializeNode(node, { maxDepth, includeChildren });

    // Export-specific: add more detail if needed
    const detailed: Record<string, unknown> = { ...(serialized ?? {}) };

    // Layout detail
    if (includeLayout && "layoutMode" in node) {
      const frame = node as FrameNode & SceneNode;
      detailed.layout = {
        layoutMode: frame.layoutMode,
        primaryAxisSizingMode: frame.primaryAxisSizingMode,
        counterAxisSizingMode: frame.counterAxisSizingMode,
        itemSpacing: frame.itemSpacing,
        paddingLeft: frame.paddingLeft,
        paddingRight: frame.paddingRight,
        paddingTop: frame.paddingTop,
        paddingBottom: frame.paddingBottom,
        primaryAxisAlignItems: frame.primaryAxisAlignItems,
        counterAxisAlignItems: frame.counterAxisAlignItems,
      };

      if (typeof frame.layoutPositioning !== "undefined") {
        (detailed.layout as Record<string, unknown>).layoutPositioning = frame.layoutPositioning;
      }
    }

    // Style detail
    if (includeStyle) {
      const styleInfo: Record<string, unknown> = {};
      if ("effectStyleId" in node) {
        styleInfo.effectStyleId = (node as unknown as Record<string, unknown>).effectStyleId;
      }
      if ("fillStyleId" in node) {
        styleInfo.fillStyleId = (node as unknown as Record<string, unknown>).fillStyleId;
      }
      if ("strokeStyleId" in node) {
        styleInfo.strokeStyleId = (node as unknown as Record<string, unknown>).strokeStyleId;
      }
      if ("textStyleId" in node) {
        styleInfo.textStyleId = (node as unknown as Record<string, unknown>).textStyleId;
      }
      if (Object.keys(styleInfo).length > 0) {
        detailed.styleIds = styleInfo;
      }
    }

    return detailed;
  });

  return { selection: nodes, count: nodes.length };
}

// ─── 6. figma_create_frame ──────────────────────────────────────────────

async function handleCreateFrame(params: Record<string, unknown>): Promise<unknown> {
  const name = params.name as string;
  const width = params.width as number;
  const height = params.height as number;
  const x = (params.x as number) ?? 0;
  const y = (params.y as number) ?? 0;
  const fill = params.fill as string | undefined;
  const cornerRadius = params.cornerRadius as number | undefined;

  const frame = figma.createFrame();
  frame.name = name;
  frame.resize(width, height);
  frame.x = x;
  frame.y = y;

  if (cornerRadius !== undefined) {
    frame.cornerRadius = cornerRadius;
  }

  // Set fill if provided
  if (fill) {
    const hex = fill.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    frame.fills = [{ type: "SOLID", color: { r, g, b }, opacity: 1 }];
  } else {
    // Default: no fill (transparent)
    frame.fills = [];
  }

  figma.currentPage.appendChild(frame);
  figma.currentPage.selection = [frame];
  figma.viewport.scrollAndZoomIntoView([frame]);

  return {
    id: frame.id,
    name: frame.name,
    type: frame.type,
    x: frame.x,
    y: frame.y,
    width: frame.width,
    height: frame.height,
  };
}

// ─── 7. figma_create_text ───────────────────────────────────────────────

async function handleCreateText(params: Record<string, unknown>): Promise<unknown> {
  const text = params.text as string;
  const name = (params.name as string) ?? text.substring(0, 40);
  const x = (params.x as number) ?? 0;
  const y = (params.y as number) ?? 0;
  const fontSize = (params.fontSize as number) ?? 16;
  const fill = params.fill as string | undefined;

  // Load font with fallback chain; track which one succeeded
  let loadedFontName: { family: string; style: string } | null = null;

  const FONT_CANDIDATES: { family: string; style: string }[] = [
    { family: "Inter", style: "Regular" },
    { family: "Roboto", style: "Regular" },
    { family: "Arial", style: "Regular" },
  ];

  for (const candidate of FONT_CANDIDATES) {
    try {
      await figma.loadFontAsync(candidate);
      loadedFontName = candidate;
      break;
    } catch {
      // Try next candidate
    }
  }

  if (!loadedFontName) {
    throw new Error(
      "Could not load any default font (Inter, Roboto, Arial). " +
        "Please ensure at least one of these fonts is available in Figma.",
    );
  }

  const textNode = figma.createText();
  textNode.name = name;
  textNode.x = x;
  textNode.y = y;
  textNode.fontSize = fontSize;

  // Set the loaded font on the text node before setting characters
  textNode.fontName = loadedFontName;

  // Set fill if provided
  if (fill) {
    const hex = fill.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    textNode.fills = [{ type: "SOLID", color: { r, g, b }, opacity: 1 }];
  }

  textNode.characters = text;

  figma.currentPage.appendChild(textNode);
  figma.currentPage.selection = [textNode];
  figma.viewport.scrollAndZoomIntoView([textNode]);

  return {
    id: textNode.id,
    name: textNode.name,
    type: textNode.type,
    characters: textNode.characters,
    x: textNode.x,
    y: textNode.y,
    fontSize: textNode.fontSize,
  };
}

// ─── 8. figma_audit_selection ───────────────────────────────────────────

interface AuditIssue {
  severity: "info" | "warning" | "error";
  category: "spacing" | "color" | "typography" | "layout" | "accessibility";
  nodeId: string;
  nodeName: string;
  message: string;
  suggestion?: string;
}

function handleAuditSelection(params: Record<string, unknown>): unknown {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    return {
      summary: "Nothing selected",
      issues: [],
      suggestions: ["Select one or more nodes to audit."],
    };
  }

  const checkSpacing = params.checkSpacing !== false;
  const checkColors = params.checkColors !== false;
  const checkTypography = params.checkTypography !== false;
  const checkAutoLayout = params.checkAutoLayout !== false;
  const checkAccessibility = params.checkAccessibility !== false;

  const issues: AuditIssue[] = [];

  for (const node of selection) {
    // Auto-layout check
    if (checkAutoLayout && "children" in node) {
      const container = node as unknown as { children: SceneNode[] };
      if (
        container.children.length > 1 &&
        (!("layoutMode" in node) ||
          (node as unknown as Record<string, unknown>).layoutMode === "NONE")
      ) {
        issues.push({
          severity: "warning",
          category: "layout",
          nodeId: node.id,
          nodeName: node.name,
          message: `Frame "${node.name}" has ${container.children.length} children but no auto layout.`,
          suggestion: "Enable auto layout (Shift+A) to create responsive layouts.",
        });
      }
    }

    // Typography check
    if (checkTypography && node.type === "TEXT") {
      const textNode = node as TextNode;
      try {
        const size = textNode.fontSize;
        if (typeof size === "number" && size < 12) {
          issues.push({
            severity: "warning",
            category: "typography",
            nodeId: node.id,
            nodeName: node.name,
            message: `Text "${node.name}" is ${size}px (below 12px minimum).`,
            suggestion: "Increase font size to at least 12px for readability.",
          });
        }
      } catch {
        // ignore font size read errors
      }
    }

    // Color check
    if (checkColors) {
      if ("fills" in node) {
        try {
          const fills = (node as unknown as { fills: Paint[] | typeof figma.mixed }).fills;
          if (fills !== figma.mixed && Array.isArray(fills) && fills.length > 1) {
            const solidCount = fills.filter((f) => f.type === "SOLID").length;
            if (solidCount > 2) {
              issues.push({
                severity: "info",
                category: "color",
                nodeId: node.id,
                nodeName: node.name,
                message: `Node "${node.name}" has ${solidCount} solid fills.`,
                suggestion: "Consider simplifying to 1-2 fills for consistency.",
              });
            }
          }
        } catch {
          // ignore
        }
      }
    }

    // Spacing check
    if (checkSpacing && "children" in node) {
      const container = node as unknown as { children: SceneNode[] };
      if (container.children.length > 0 && "paddingLeft" in node) {
        const frame = node as FrameNode;
        const hasPadding =
          frame.paddingLeft > 0 ||
          frame.paddingRight > 0 ||
          frame.paddingTop > 0 ||
          frame.paddingBottom > 0;
        if (!hasPadding && container.children.length > 1) {
          issues.push({
            severity: "info",
            category: "spacing",
            nodeId: node.id,
            nodeName: node.name,
            message: `Frame "${node.name}" has ${container.children.length} children but no padding.`,
            suggestion: "Add padding to create breathing room around content.",
          });
        }
      }
    }

    // Generic naming check
    if (node.name.match(/^(Frame|Rectangle|Ellipse|Text|Component|Group)\s*\d*$/)) {
      issues.push({
        severity: "info",
        category: "layout",
        nodeId: node.id,
        nodeName: node.name,
        message: `Node has a generic name: "${node.name}".`,
        suggestion: "Rename to something descriptive (e.g., 'card-container', 'hero-title').",
      });
    }

    // Accessibility: text contrast note (basic)
    if (checkAccessibility && node.type === "TEXT") {
      const textNode = node as TextNode;
      try {
        const size = textNode.fontSize;
        if (typeof size === "number" && size < 12) {
          issues.push({
            severity: "error",
            category: "accessibility",
            nodeId: node.id,
            nodeName: node.name,
            message: `Text "${node.name}" at ${size}px may not be readable.`,
            suggestion: "Use at least 12px for body text, 16px for comfortable reading.",
          });
        }
      } catch {
        // ignore
      }
    }
  }

  const severityCounts = { error: 0, warning: 0, info: 0 };
  for (const issue of issues) {
    severityCounts[issue.severity]++;
  }

  return {
    summary: `Audited ${selection.length} node(s): ${issues.length} issue(s) found (${severityCounts.error} error(s), ${severityCounts.warning} warning(s), ${severityCounts.info} info).`,
    nodeCount: selection.length,
    issueCount: issues.length,
    issues,
    suggestions: issues
      .filter((i) => i.suggestion)
      .map((i) => i.suggestion)
      .filter((v, idx, arr) => arr.indexOf(v) === idx), // unique
  };
}
