# Architecture

## Overview

`figma-opencode-mcp` is a local-first MCP (Model Context Protocol) server that connects AI coding agents (OpenCode, Codex) to the currently open Figma file through a local plugin bridge.

The key design principle is **no Figma API token required** in default mode. All communication happens locally between processes running on your machine.

## System Flow

```
┌──────────────┐     stdio (JSON-RPC)     ┌──────────────────────┐
│              │ ◄──────────────────────► │                      │
│  OpenCode /  │                          │   MCP Server         │
│  Codex       │                          │   (src/index.ts)     │
│              │                          │                      │
└──────────────┘                          │  ┌────────────────┐  │
                                           │  │  BridgeClient  │  │
                                           │  └───────┬────────┘  │
                                           └──────────┼───────────┘
                                                      │
                                              WebSocket (127.0.0.1:3845)
                                                      │
                                           ┌──────────┼───────────┐
                                           │  ┌───────┴────────┐  │
                                           │  │  Plugin UI     │  │
                                           │  │  (WebSocket)   │  │
                                           │  └───────┬────────┘  │
                                           │          │ postMessage│
                                           │  ┌───────┴────────┐  │
                                           │  │  Plugin Main   │  │
                                           │  │  (code.ts)     │  │
                                           │  └───────┬────────┘  │
                                           └──────────┼───────────┘
                                                      │
                                              Figma Plugin API
                                                      │
                                           ┌──────────┴───────────┐
                                           │                      │
                                           │  Figma File (open)   │
                                           │                      │
                                           └──────────────────────┘
```

## Why stdio for MCP?

MCP supports stdio transport natively. It's the simplest, most reliable way for local tools:

- No HTTP server to manage
- No port conflicts for the MCP channel
- Direct process communication
- Standard JSON-RPC over stdin/stdout

## Why WebSocket for the plugin bridge?

The Figma plugin runs in a sandboxed environment inside Figma (or a browser). It cannot:

- Create a TCP server
- Listen on a port
- Use Unix sockets

However, the plugin **UI** can initiate a WebSocket connection to a local server. This is the only practical way to establish bidirectional communication between the MCP server and the Figma plugin.

## Why plugin UI handles WebSocket, not plugin main code?

Figma plugin architecture:

- **Plugin main code** (`code.ts`): Full access to Figma Plugin API but **no network access**
- **Plugin UI** (`ui.html`): Runs in a sandboxed iframe, has limited network access (WebSocket to localhost)

Since the plugin main code cannot make network connections, the UI must handle the WebSocket. Messages are forwarded between UI and main code via `postMessage`.

## Limitations

- The MCP server **cannot access arbitrary Figma files**. It can only read/write the file that is currently open in Figma with the bridge plugin running.
- The plugin must be manually launched in the Figma file.
- Only one plugin connection is supported at a time in v0.1.0.
- Performance depends on Figma file complexity and selection size.
- The bridge adds ~1-15ms latency per request (WebSocket localhost).
