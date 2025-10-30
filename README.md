# playpen

Google search automation via Playwright MCP. Can be used as a CLI tool or as an MCP server.

## Installation

```bash
npm install -g playpen
```

Or use directly with npx:

```bash
npx -y playpen@latest google-search
```

## Usage

### As an MCP Server

Start playpen as an MCP server to expose all flows as tools:

```bash
playpen mcp
```

Or configure in your MCP client settings (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "playpen": {
      "command": "npx",
      "args": ["-y", "playpen@latest", "mcp"]
    }
  }
}
```

Available MCP tools:
- `fetch` - Fetch and extract main content from a web page URL
- `google-search` - Perform a Google search and extract results

### As a CLI Tool

### Google Search
```bash
playpen google-search
```

Output format:
```json
{
  "query": "Playwright automation testing",
  "totalResults": 18,
  "results": [
    {
      "title": "Playwright: Fast and reliable end-to-end testing for modern ...",
      "url": "https://playwright.dev/",
      "description": "Playwright enables reliable end-to-end testing for modern web apps..."
    }
  ]
}
```

### Fetch URL Content
Extract important text content from any URL:

```bash
playpen fetch https://example.com
```

Output format:
```json
{
  "url": "https://example.com/",
  "title": "Example Domain",
  "contentLength": 129,
  "content": "# Example Domain\nThis domain is for use in documentation examples..."
}
```

Perfect for:
- Extracting documentation from websites
- Fetching article content
- Parsing blog posts
- Getting README content from GitHub
- Any text-heavy webpage

## Creating Custom Flows

Flows are JavaScript modules that export a single async function. The function receives a connected `PlaywrightMCPClient` instance.

Create a new flow in the `flows/` directory:

```javascript
module.exports = async function(client) {
  await client.navigate('https://example.com');

  const snapshot = await client.snapshot();
  console.log('Page loaded');

  await client.close();
};
```

## Available Client Methods

### Connection
- `connect()` - Connect to Playwright MCP server
- `disconnect()` - Disconnect and cleanup

### Tools Discovery
- `listTools()` - List all available tools
- `callTool(name, args)` - Call any tool directly

### Browser Control
- `navigate(url)` - Navigate to URL
- `navigateBack()` - Go back
- `close()` - Close browser
- `resize(width, height)` - Resize window
- `install()` - Install browser

### Page Interaction
- `snapshot()` - Get accessibility snapshot
- `click(element, ref)` - Click element
- `type(element, ref, text, submit, slowly)` - Type text
- `pressKey(key)` - Press keyboard key
- `hover(element, ref)` - Hover over element
- `drag(startElement, startRef, endElement, endRef)` - Drag and drop

### Forms
- `fillForm(fields)` - Fill multiple form fields
- `selectOption(element, ref, values)` - Select dropdown option
- `fileUpload(paths)` - Upload files

### Page State
- `evaluate(func)` - Execute JavaScript
- `screenshot(filename, type, fullPage, element, ref)` - Take screenshot
- `consoleMessages(onlyErrors)` - Get console logs
- `networkRequests()` - Get network activity

### Dialogs
- `handleDialog(accept, promptText)` - Handle alerts/confirms

### Tabs
- `tabs(action, index)` - Manage browser tabs

### Wait
- `waitFor(text, textGone, time)` - Wait for conditions

## Flow Details

### google-search
- Navigates to Google
- Searches for "Playwright automation testing"
- Waits 30 seconds for results to load
- Extracts all result titles, URLs, and descriptions
- Returns comprehensive JSON output with full result metadata

### fetch
- Accepts a URL as an argument
- Navigates to the URL
- Intelligently extracts main content using heuristics:
  - Prioritizes `<main>`, `<article>`, and semantic content areas
  - Extracts structured text including headings, paragraphs, lists, and code blocks
  - Removes duplicate content and navigation elements
  - Formats output as clean markdown
- Returns JSON with URL, title, content length, and extracted content
- Limits output to 50,000 characters for conciseness
- Works universally across documentation sites, blogs, articles, and more

## Requirements

- Node.js 14+
- Playwright MCP server (installed automatically via npx)

## Notes

- Always close the browser before flows complete
- Supports `file://` URLs for local testing
- Use `browser_evaluate` for debugging window globals
- No hardcoded values - all flows use ground truth from snapshots
- Screenshots are automatically saved to `/tmp/playwright-mcp-output/<timestamp>/`
