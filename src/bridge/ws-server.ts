/**
 * WebSocket bridge server.
 *
 * Binds to 127.0.0.1:3845 (default) and accepts a single Figma plugin client.
 * Validates all incoming JSON messages and forwards BridgeRequests from the
 * MCP server to the plugin.
 */

import { WebSocket, WebSocketServer } from "ws";
import { createServer, type IncomingMessage } from "node:http";
import { rootLogger } from "../shared/logger.js";
import {
  type BridgeIncomingMessage,
  type BridgeOutgoingMessage,
  type BridgeHello,
  type BridgeResponse,
  type BridgeDisconnect,
  isBridgeIncomingMessage,
  DEFAULT_BRIDGE_HOST,
  DEFAULT_BRIDGE_PORT,
} from "../shared/protocol.js";
import { PendingRequests } from "./pending-requests.js";

const logger = rootLogger;

export type PluginStatusCallback = (connected: boolean, hello?: BridgeHello) => void;
export type PluginResponseCallback = (response: BridgeResponse) => void;

export interface WsBridgeServerOptions {
  host?: string;
  port?: number;
  onPluginStatusChange?: PluginStatusCallback;
  onPluginResponse?: PluginResponseCallback;
}

export class WsBridgeServer {
  private _wss: WebSocketServer | null = null;
  private _httpServer: ReturnType<typeof createServer> | null = null;
  private _pluginSocket: WebSocket | null = null;
  private _pluginHello: BridgeHello | null = null;
  private _host: string;
  private _port: number;
  private _onPluginStatusChange?: PluginStatusCallback;
  private _onPluginResponse?: PluginResponseCallback;
  private _pendingRequests: PendingRequests;

  constructor(options: WsBridgeServerOptions = {}) {
    this._host = options.host ?? DEFAULT_BRIDGE_HOST;
    this._port = options.port ?? DEFAULT_BRIDGE_PORT;
    this._onPluginStatusChange = options.onPluginStatusChange;
    this._onPluginResponse = options.onPluginResponse;
    this._pendingRequests = new PendingRequests();
  }

  get host(): string {
    return this._host;
  }

  get port(): number {
    return this._port;
  }

  get pluginConnected(): boolean {
    return this._pluginSocket !== null && this._pluginHello !== null;
  }

  get pluginHello(): BridgeHello | null {
    return this._pluginHello;
  }

  get pendingRequests(): PendingRequests {
    return this._pendingRequests;
  }

  /**
   * Start the WebSocket server.
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this._httpServer = createServer();

      this._wss = new WebSocketServer({
        server: this._httpServer,
        maxPayload: 50 * 1024 * 1024, // 50MB max message
      });

      this._wss.on("connection", (ws, req) => {
        this._handleConnection(ws, req);
      });

      this._wss.on("error", (err) => {
        logger.error("WebSocket server error:", err);
      });

      this._httpServer.on("error", (err: NodeJS.ErrnoException) => {
        if (err.code === "EADDRINUSE") {
          reject(new Error(`Port ${this._port} is already in use. Is another instance running?`));
        } else {
          reject(err);
        }
      });

      this._httpServer.listen(this._port, this._host, () => {
        logger.info(`Bridge WS server listening on ws://${this._host}:${this._port}`);
        resolve();
      });
    });
  }

  /**
   * Stop the WebSocket server and disconnect the plugin.
   */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      this._disconnectPlugin("Server shutting down");
      if (this._wss) {
        this._wss.close(() => {
          if (this._httpServer) {
            this._httpServer.close(() => resolve());
          } else {
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Send a request to the plugin.
   */
  sendRequest(request: BridgeOutgoingMessage): boolean {
    if (!this._pluginSocket || this._pluginSocket.readyState !== WebSocket.OPEN) {
      logger.warn("Cannot send request: plugin not connected");
      return false;
    }
    try {
      this._pluginSocket.send(JSON.stringify(request));
      return true;
    } catch (err) {
      logger.error("Failed to send request to plugin:", err);
      return false;
    }
  }

  // ─── Internal ─────────────────────────────────────────────────────────

  private _handleConnection(ws: WebSocket, _req: IncomingMessage): void {
    const remoteAddr = _req.socket.remoteAddress ?? "unknown";
    logger.info(`Plugin connection from ${remoteAddr}`);

    // Only allow localhost connections
    if (remoteAddr !== "127.0.0.1" && remoteAddr !== "::1" && remoteAddr !== "::ffff:127.0.0.1") {
      logger.warn(`Rejected non-local connection from ${remoteAddr}`);
      ws.close(4001, "Only local connections allowed");
      return;
    }

    // If a plugin is already connected, replace it
    if (this._pluginSocket) {
      logger.info("Replacing existing plugin connection");
      this._disconnectPlugin("Replaced by new connection");
    }

    this._pluginSocket = ws;

    ws.on("message", (raw) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw.toString());
      } catch {
        logger.warn("Invalid JSON from plugin");
        ws.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
        return;
      }

      if (!isBridgeIncomingMessage(parsed)) {
        logger.warn("Unknown message shape from plugin:", typeof parsed);
        return;
      }

      const msg = parsed as BridgeIncomingMessage;

      switch (msg.type) {
        case "hello": {
          const hello = msg as BridgeHello;
          this._pluginHello = hello;
          logger.info(
            `Plugin connected: ${hello.plugin} v${hello.version}` +
              (hello.figma?.fileName ? ` — file: ${hello.figma.fileName}` : ""),
          );
          this._onPluginStatusChange?.(true, hello);
          break;
        }
        case "response": {
          const response = msg as BridgeResponse;
          this._pendingRequests.resolve(response.request_id, response);
          this._onPluginResponse?.(response);
          break;
        }
        case "disconnect": {
          const disc = msg as BridgeDisconnect;
          logger.info(`Plugin disconnected: ${disc.reason ?? "unknown reason"}`);
          this._disconnectPlugin(disc.reason ?? "Plugin disconnected");
          break;
        }
        default:
          logger.warn("Unknown message type from plugin:", (msg as Record<string, unknown>).type);
      }
    });

    ws.on("close", () => {
      logger.info("Plugin WebSocket closed");
      if (this._pluginSocket === ws) {
        this._disconnectPlugin("WebSocket closed");
      }
    });

    ws.on("error", (err) => {
      logger.error("Plugin WebSocket error:", err);
      if (this._pluginSocket === ws) {
        this._disconnectPlugin("WebSocket error");
      }
    });
  }

  private _disconnectPlugin(reason: string): void {
    if (this._pluginSocket) {
      try {
        this._pluginSocket.close(1000, reason);
      } catch {
        // ignore close errors
      }
      this._pluginSocket = null;
    }
    this._pluginHello = null;
    this._pendingRequests.rejectAll(`Plugin disconnected: ${reason}`);
    this._onPluginStatusChange?.(false);
  }
}
