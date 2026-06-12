/**
 * Pending request manager for bridge communication.
 *
 * Tracks outgoing requests sent to the Figma plugin, handles timeouts,
 * and prevents memory leaks on disconnect or timeout.
 */

import { rootLogger } from "../shared/logger.js";

const logger = rootLogger;

interface PendingEntry {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  timeout: ReturnType<typeof setTimeout>;
  tool: string;
  startedAt: number;
}

export class PendingRequests {
  private _map = new Map<string, PendingEntry>();
  private _defaultTimeoutMs: number;

  constructor(defaultTimeoutMs = 15_000) {
    this._defaultTimeoutMs = defaultTimeoutMs;
  }

  /**
   * Register a pending request.
   * Returns the request_id for use in the bridge message.
   */
  register(
    tool: string,
    timeoutMs?: number,
  ): { requestId: string; promise: Promise<unknown> } {
    const requestId = crypto.randomUUID();
    const timeout = timeoutMs ?? this._defaultTimeoutMs;

    let resolve: (value: unknown) => void = () => {};
    let reject: (reason: unknown) => void = () => {};

    const promise = new Promise<unknown>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    const timeoutHandle = setTimeout(() => {
      if (this._map.has(requestId)) {
        this._map.delete(requestId);
        reject(
          new Error(
            `Bridge request "${tool}" timed out after ${timeout}ms`,
          ),
        );
        logger.warn(`Request ${requestId} ("${tool}") timed out`);
      }
    }, timeout);

    this._map.set(requestId, {
      resolve,
      reject,
      timeout: timeoutHandle,
      tool,
      startedAt: Date.now(),
    });

    return { requestId, promise };
  }

  /**
   * Resolve a pending request with the given result.
   */
  resolve(requestId: string, result: unknown): boolean {
    const entry = this._map.get(requestId);
    if (!entry) {
      logger.warn(`Received response for unknown request: ${requestId}`);
      return false;
    }
    clearTimeout(entry.timeout);
    this._map.delete(requestId);
    entry.resolve(result);
    return true;
  }

  /**
   * Reject all pending requests (e.g., on plugin disconnect).
   */
  rejectAll(reason: string): void {
    if (this._map.size === 0) return;
    logger.warn(
      `Rejecting ${this._map.size} pending request(s): ${reason}`,
    );
    for (const [id, entry] of this._map.entries()) {
      clearTimeout(entry.timeout);
      entry.reject(new Error(reason));
    }
    this._map.clear();
  }

  /**
   * Current number of pending requests.
   */
  get size(): number {
    return this._map.size;
  }
}
