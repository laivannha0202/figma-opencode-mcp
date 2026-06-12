/**
 * MCP server setup.
 *
 * Uses the high-level McpServer from @modelcontextprotocol/sdk.
 * Registers all tools with zod validation schemas, routes calls to
 * tool-handlers.ts, and connects via StdioServerTransport.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { rootLogger } from "../shared/logger.js";
import { SERVER_NAME, SERVER_VERSION, SUPPORTED_TOOLS } from "../shared/protocol.js";
import { TOOL_DESCRIPTORS } from "./tools.js";
import { ALL_TOOL_SCHEMAS, type ToolSchemaMap } from "./tool-schemas.js";
import { createHandlers, type HandlerContext } from "./tool-handlers.js";
import type { BridgeClient } from "../bridge/bridge-client.js";
import { McpError } from "../shared/errors.js";

const logger = rootLogger;

export class FigmaMcpServer {
  private _mcpServer: McpServer;
  private _handlers: ReturnType<typeof createHandlers>;
  private _started = false;

  constructor(bridgeClient: BridgeClient) {
    const ctx: HandlerContext = { bridgeClient };
    this._handlers = createHandlers(ctx);

    this._mcpServer = new McpServer(
      {
        name: SERVER_NAME,
        version: SERVER_VERSION,
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    this._registerAllTools();
  }

  /**
   * Start the MCP server with stdio transport.
   * This attaches to process.stdin/stdout for JSON-RPC.
   */
  async start(): Promise<void> {
    if (this._started) {
      logger.warn("MCP server already started");
      return;
    }

    const transport = new StdioServerTransport();
    await this._mcpServer.connect(transport);
    this._started = true;
    logger.info("MCP server started (stdio transport)");
  }

  /**
   * Close the MCP server.
   */
  async close(): Promise<void> {
    if (!this._started) return;
    await this._mcpServer.close();
    this._started = false;
    logger.info("MCP server closed");
  }

  // ─── Private ──────────────────────────────────────────────────────────

  private _registerAllTools(): void {
    const schemas = ALL_TOOL_SCHEMAS;

    for (const desc of TOOL_DESCRIPTORS) {
      const toolName = desc.name;
      const schema = schemas[toolName as keyof ToolSchemaMap];
      const handler = this._handlers[toolName];

      if (!handler) {
        logger.warn(`No handler for tool: ${toolName}`);
        continue;
      }

      this._registerTool(toolName, desc.description, schema, handler);
    }

    logger.info(`Registered ${TOOL_DESCRIPTORS.length} tools`);
  }

  /**
   * Register a single tool with the MCP server.
   *
   * Uses registerTool with the zod object schema.
   * Catches errors so a single bad handler doesn't crash the server.
   */
  private _registerTool(
    name: string,
    description: string,
    schema: z.ZodObject<z.ZodRawShape> | z.ZodOptional<z.ZodObject<z.ZodRawShape>>,
    handler: (params: Record<string, unknown> | undefined) => Promise<unknown>,
  ): void {
    // For empty schemas (z.object({}).optional()), use undefined as inputSchema
    // so the tool takes no arguments
    const isNoParams =
      schema instanceof z.ZodOptional ||
      (schema instanceof z.ZodObject && Object.keys(schema.shape).length === 0);

    if (isNoParams) {
      this._mcpServer.registerTool(
        name,
        {
          description,
          inputSchema: undefined,
        },
        async () => {
          try {
            const result = await handler(undefined);
            return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
          } catch (err) {
            return _formatError(err);
          }
        },
      );
    } else {
      // For tools with params, pass the raw shape object
      const shape = schema instanceof z.ZodObject ? schema.shape : {};
      this._mcpServer.registerTool(
        name,
        {
          description,
          inputSchema: shape,
        },
        async (args: Record<string, unknown>) => {
          try {
            const result = await handler(args);
            return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
          } catch (err) {
            return _formatError(err);
          }
        },
      );
    }
  }
}

/**
 * Format any error into a safe MCP CallToolResult error response.
 */
function _formatError(err: unknown): {
  content: { type: "text"; text: string }[];
  isError: boolean;
} {
  if (err instanceof McpError) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(err.toJson(), null, 2),
        },
      ],
      isError: true,
    };
  }

  const message = err instanceof Error ? err.message : String(err);
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({ code: "UNKNOWN_ERROR", message, details: undefined }, null, 2),
      },
    ],
    isError: true,
  };
}
