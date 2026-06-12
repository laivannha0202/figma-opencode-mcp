/**
 * Logger that writes exclusively to stderr.
 *
 * MCP uses stdout for JSON-RPC messages, so all debug/info/warn/error
 * output must go to stderr to avoid corrupting the protocol stream.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export interface Logger {
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

export function createLogger(name: string, minLevel: LogLevel = "info"): Logger {
  const minPriority = LEVEL_PRIORITY[minLevel];

  function log(level: LogLevel, ...args: unknown[]): void {
    if (LEVEL_PRIORITY[level] < minPriority) return;
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [${name}]`;
    // stderr only — never use console.log
    const stream = level === "error" ? process.stderr : process.stderr;
    stream.write(`${prefix} ${args.map(String).join(" ")}\n`);
  }

  return {
    debug: (...args: unknown[]) => log("debug", ...args),
    info: (...args: unknown[]) => log("info", ...args),
    warn: (...args: unknown[]) => log("warn", ...args),
    error: (...args: unknown[]) => log("error", ...args),
  };
}

/** Shared root logger instance */
export const rootLogger = createLogger("figma-opencode-mcp", "info");
