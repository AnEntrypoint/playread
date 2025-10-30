# Playread Technical Information

## Project Structure
- index.js: PlaywrightMCPClient class wrapping @playwright/mcp (154 lines)
- cli.js: CLI for direct flow execution via npx (74 lines)
- mcp-server.js: stdio MCP server exposing flows as tools (141 lines)
- flows/fetch.js: URL content extraction returning JSON (152 lines)
- flows/google-search.js: Google search returning JSON results (80 lines)

## MCP Server Implementation
- Stdio transport server exposing all flows/ files as MCP tools
- executeFlow: connects client, executes flow with args, returns result
- Flow schemas: fetch requires url, google-search has no required args
- Flows must return string results (JSON.stringify for objects)
- Client lifecycle: connect -> execute -> disconnect per flow call
- Usage: npx playpen-mcp (or node mcp-server.js locally)
- Config: {"command": "npx", "args": ["-y", "playpen-mcp"]}

## Dependencies
- @modelcontextprotocol/sdk: ^1.0.4 (Client/Server + transports)

## Architecture
- PlaywrightMCPClient: wrapper for @playwright/mcp stdio transport
- Flows: async functions receiving (client, ...args) returning strings
- MCP tools dynamically generated from flows/ directory
- No failovers/fallbacks - errors propagate directly
