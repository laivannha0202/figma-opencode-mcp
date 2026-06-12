/**
 * Standardized error types for the MCP server.
 *
 * Every error response includes:
 *   - code:    machine-readable error code
 *   - message: human-readable description
 *   - details: optional additional context
 */

export interface McpErrorDetail {
  code: string;
  message: string;
  details?: unknown;
}

export class McpError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = "McpError";
    this.code = code;
    this.details = details;
  }

  toJson(): McpErrorDetail {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

// ─── Specific error factories ───────────────────────────────────────────

export function pluginNotConnectedError(): McpError {
  return new McpError(
    "PLUGIN_NOT_CONNECTED",
    "Figma plugin is not connected. Open Figma, run the plugin, then try again.",
  );
}

export function bridgeTimeoutError(tool: string, timeoutMs: number): McpError {
  return new McpError(
    "BRIDGE_TIMEOUT",
    `Bridge request "${tool}" timed out after ${timeoutMs}ms. Is the Figma plugin running?`,
  );
}

export function invalidParamsError(message: string, details?: unknown): McpError {
  return new McpError("INVALID_PARAMS", message, details);
}

export function bridgeRequestError(
  tool: string,
  pluginMessage: string,
  details?: unknown,
): McpError {
  return new McpError(
    "BRIDGE_REQUEST_ERROR",
    `Plugin error for "${tool}": ${pluginMessage}`,
    details,
  );
}

export function internalError(message: string, details?: unknown): McpError {
  return new McpError("INTERNAL_ERROR", message, details);
}

export function unsupportedToolError(tool: string): McpError {
  return new McpError("UNSUPPORTED_TOOL", `Tool "${tool}" is not supported in this version.`);
}
