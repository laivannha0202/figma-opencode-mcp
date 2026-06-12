# MCP Tools Reference

All tools are available once the MCP server is running and the Figma plugin is connected.

---

## figma_ping

**Purpose:** Check if the MCP server is alive and the Figma plugin bridge is connected.

**Input:** None

**Output:**
```json
{
  "ok": true,
  "server": "figma-opencode-mcp",
  "version": "0.1.0",
  "bridge": {
    "host": "127.0.0.1",
    "port": 3845,
    "pluginConnected": true
  }
}
```

**Errors:**
- If plugin not connected: `ok: false` with descriptive message.

**Example usage:**
```
Check if Figma is connected with figma_ping.
```

---

## figma_get_selection

**Purpose:** Get the list of currently selected nodes in the active Figma file.

**Input:**
- `includeChildren` (boolean, optional): Include children recursively.
- `maxDepth` (number, optional): Max depth for children (1-10, default: 3).

**Output:**
```json
{
  "selection": [
    {
      "id": "1:2",
      "name": "Frame 1",
      "type": "FRAME",
      "visible": true,
      "x": 0,
      "y": 0,
      "width": 100,
      "height": 100,
      "fills": [...],
      "children": [...]
    }
  ],
  "count": 1
}
```

**Example usage:**
```
Call figma_get_selection to see what I have selected.
```

---

## figma_get_current_page

**Purpose:** Get information about the current page.

**Input:** None

**Output:**
```json
{
  "id": "0:0",
  "name": "Page 1",
  "childCount": 5,
  "topLevelNodes": [
    { "id": "1:2", "name": "Frame 1", "type": "FRAME" }
  ]
}
```

**Example usage:**
```
What page am I on? Use figma_get_current_page.
```

---

## figma_get_node_tree

**Purpose:** Get the node tree starting from the current page or a specific node.

**Input:**
- `nodeId` (string, optional): Node ID to start from (default: current page).
- `maxDepth` (number, optional): Max depth (1-10, default: 5).
- `includeInvisible` (boolean, optional): Include invisible nodes.

**Output:** Recursive tree of serialized nodes.

**Example usage:**
```
Show me the node tree of my current page with figma_get_node_tree.
```

---

## figma_export_selection_json

**Purpose:** Export the current selection as structured JSON, optimized for design-to-code workflows.

**Input:**
- `includeStyle` (boolean, optional): Include style properties (default: true).
- `includeLayout` (boolean, optional): Include layout properties (default: true).
- `includeChildren` (boolean, optional): Include children (default: true).
- `maxDepth` (number, optional): Max depth (1-10, default: 5).

**Output:** Detailed JSON with geometry, layout, typography, colors, spacing, auto layout info.

**Example usage:**
```
Export my selection as JSON with figma_export_selection_json and generate a React component.
```

---

## figma_create_frame

**Purpose:** Create a new frame node in the current page.

**Input:**
- `name` (string, required): Frame name.
- `x` (number, optional): X position (default: 0).
- `y` (number, optional): Y position (default: 0).
- `width` (number, required): Frame width (> 0).
- `height` (number, required): Frame height (> 0).
- `fill` (string, optional): Hex fill color `#RRGGBB`.
- `cornerRadius` (number, optional): Corner radius.

**Output:**
```json
{
  "id": "100:1",
  "name": "My Frame",
  "type": "FRAME",
  "x": 0,
  "y": 0,
  "width": 300,
  "height": 200
}
```

**Errors:**
- `INVALID_PARAMS` if width/height <= 0 or fill is not valid hex.

**Example usage:**
```
Create a frame named "Hero" that is 1440x800 with a blue background #1a1a2e.
```

---

## figma_create_text

**Purpose:** Create a new text node in the current page.

**Input:**
- `text` (string, required): Text content.
- `name` (string, optional): Node name (default: first 40 chars of text).
- `x` (number, optional): X position (default: 0).
- `y` (number, optional): Y position (default: 0).
- `fontSize` (number, optional): Font size in px (default: 16).
- `fill` (string, optional): Hex text color `#RRGGBB`.

**Output:**
```json
{
  "id": "100:2",
  "name": "Hello World",
  "type": "TEXT",
  "characters": "Hello World",
  "x": 0,
  "y": 0,
  "fontSize": 24
}
```

**Errors:**
- If default fonts cannot be loaded.

**Example usage:**
```
Add a heading "Welcome" in bold 48px at position 100, 100.
```

---

## figma_audit_selection

**Purpose:** Audit the current selection for design system issues.

**Input:**
- `checkSpacing` (boolean, optional): Check spacing issues.
- `checkColors` (boolean, optional): Check color consistency.
- `checkTypography` (boolean, optional): Check typography issues.
- `checkAutoLayout` (boolean, optional): Check auto-layout usage.
- `checkAccessibility` (boolean, optional): Check accessibility.

**Output:**
```json
{
  "summary": "Audited 3 node(s): 4 issue(s) found (0 error(s), 2 warning(s), 2 info).",
  "nodeCount": 3,
  "issueCount": 4,
  "issues": [
    {
      "severity": "warning",
      "category": "layout",
      "nodeId": "1:2",
      "nodeName": "Frame 1",
      "message": "...",
      "suggestion": "..."
    }
  ],
  "suggestions": ["..."]
}
```

**Example usage:**
```
Audit my selection for design system issues with figma_audit_selection.
```
