# Playread Technical Information

## Project Structure
- index.js: PlaywrightMCPClient class wrapping @playwright/mcp (154 lines)
- cli.js: CLI for direct flow execution via npx (74 lines)
- mcp-server.js: stdio MCP server exposing flows as tools (141 lines)
- http-server.js: Streamable HTTP MCP server for remote access (160 lines)
- flows/fetch.js: URL content extraction returning JSON (152 lines)
- flows/google-search.js: Google search returning JSON results (80 lines)

## MCP Server Implementation
- Stdio transport server exposing all flows/ files as MCP tools
- Streamable HTTP transport server for remote client access
- executeFlow: connects client, executes flow with args, returns result
- Flow schemas: fetch requires url, google-search has no required args
- Flows must return string results (JSON.stringify for objects)
- Client lifecycle: connect -> execute -> disconnect per flow call

## Deployment Options
- Local stdio: `npm run mcp` or `node mcp-server.js`
- HTTP remote: `npm run http` or `node http-server.js` (default port 3000)
- Nixpacks deployment: PORT=3000, PLAYWRIGHT_HEADLESS=true via nixpacks.toml
- Docker: `docker build -t playread . && docker run -p 3000:3000 playread`

## HTTP Server Endpoints
- POST /mcp: Streamable HTTP MCP protocol (requires Accept: application/json, text/event-stream)
- GET /health: Health check endpoint (returns {"status":"ok"})

## Container Configuration
- nixpacks.toml: Explicit Nix packages including chromium, display libraries (libdrm, mesa)
- PLAYWRIGHT_HEADLESS=true: Forces Playwright to run headless (no DISPLAY needed)
- nodejs_22 + npm for build and runtime

## Dependencies
- @modelcontextprotocol/sdk: ^1.0.4 (Client/Server + transports)
- @playwright/mcp: ^0.0.44 (Browser automation via MCP)
- express: ^5.0.0 (HTTP server framework)
- cors: ^2.8.5 (CORS middleware)
- zod: ^3.22.4 (Schema validation)

## Architecture
- PlaywrightMCPClient: wrapper for @playwright/mcp stdio transport
- Flows: async functions receiving (client, ...args) returning strings
- MCP tools dynamically generated from flows/ directory
- No failovers/fallbacks - errors propagate directly
- Headless Playwright mode in container/CI environments via PLAYWRIGHT_HEADLESS
