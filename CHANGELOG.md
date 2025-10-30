# CHANGELOG

## v1.2.1 - Headless Playwright & Nixpacks Optimization
- Configured Playwright to run in headless mode (PLAYWRIGHT_HEADLESS=true)
- Updated nixpacks.toml with explicit Nix packages (chromium, libdrm, mesa, etc)
- Removed display-based configuration (DISPLAY) in favor of headless mode
- Added explicit npm package to Nix dependencies
- Changed port from 8080 to 3000 for consistency
- Verified HTTP MCP server works correctly with Streamable HTTP transport
- Cleaned up orphaned test files (test.json)
- Updated documentation in CLAUDE.md

## v1.2.0 - HTTP/Streamable HTTP Support
- Added http-server.js with Streamable HTTP transport for remote access
- Implemented McpServer with dynamic flow-based tools registration
- Added Express.js HTTP server with CORS support
- Created nixpacks.toml for container deployment (supports Playwright)
- Added cors and zod dependencies
- HTTP endpoint: POST /mcp for MCP protocol communication
- Health check endpoint: GET /health
- Supports PORT environment variable (default 3000, Nixpacks uses 8080)
- Remote clients can now connect via HTTP instead of requiring stdio

## v1.1.2 - Code Cleanup
- Fixed await syntax error in cli.js
- Removed dead test files (direct-test-*.js, test-wcostream.js)
- Removed TEST_ANALYSIS_REPORT.md
- Cleaned up package.json scripts
- Fixed CLI help functionality
- Verified all flows working correctly

## v1.1.1 - Previous version
- Web content extraction and automation via Playwright MCP
