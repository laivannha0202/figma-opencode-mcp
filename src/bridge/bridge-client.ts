/**
 * BridgeClient — abstraction over the WebSocket bridge for MCP tool handlers.
 *
 * Provides a simple async request/response interface so tool handlers
 * don't need to know about WebSocket or pending request management.
 */

import { rootLogger } from "../shared/logger.js";
import {
  type BridgeRequest,
  type BridgeResponse,
  type BridgeHello,
  DEFAULT_REQUEST_TIMEOUT_MS,
} from "../shared/protocol.js";
import {
  pluginNotConnectedError,
  bridgeTimeoutError,
  bridgeRequestError,
  McpError,
} from "../shared/errors.js";
import { WsBridgeServer } from "./ws-server.js";

const logger = rootLogger;

export class BridgeClient {
  private _server: WsBridgeServer;

  constructor(server: WsBridgeServer) {
    this._server = server;
  }

  /**
   * Whether the plugin is currently connected.
   */
  get pluginConnected(): boolean {
    return this._server.pluginConnected;
  }

  /**
   * Plugin hello info, if connected.
   */
  get pluginHello(): BridgeHello | null {
    return this._server.pluginHello;
  }

  /**
   * Send a tool request to the Figma plugin and wait for the response.
   *
   * @param tool — tool name (e.g., "figma_get_selection")
   * @param params — parameters to send
   * @param timeoutMs — optional timeout override
   * @returns the result from the plugin
   * @throws McpError if plugin is not connected, request times out, or plugin returns error
   */
  async request(tool: string, params: unknown, timeoutMs?: number): Promise<unknown> {
    if (!this._server.pluginConnected) {
      throw pluginNotConnectedError();
    }

    const timeout = timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
    const { requestId, promise } = this._server.pendingRequests.register(tool, timeout);

    const request: BridgeRequest = {
      type: "request",
      request_id: requestId,
      tool,
      params,
    };

    const sent = this._server.sendRequest(request);
    if (!sent) {
      // Failed to send — clean up
      this._server.pendingRequests.resolve(requestId, null);
      throw pluginNotConnectedError();
    }

    // Wait for the result
    let raw: unknown;
    try {
      raw = await promise;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("timed out")) {
        throw bridgeTimeoutError(tool, timeout);
      }
      throw bridgeRequestError(tool, message);
    }

    // The promise resolves to the full BridgeResponse
    const response = raw as BridgeResponse;

    if (!response.ok) {
      throw bridgeRequestError(
        tool,
        response.error?.message ?? "Unknown plugin error",
        response.error?.details,
      );
    }

    return response.result;
  }

  /**
   * Simple ping — checks if both MCP server and plugin are reachable.
   * Does not actually send a bridge request; returns cached status.
   */
  ping(): { ok: boolean; pluginConnected: boolean; hello: BridgeHello | null } {
    return {
      ok: this.pluginConnected,
      pluginConnected: this.pluginConnected,
      hello: this.pluginHello,
    };
  }
}
