const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const { spawn } = require('child_process');

class PlaywrightMCPDirect {
  constructor() {
    this.client = null;
    this.transport = null;
    this.process = null;
  }

  async connect() {
    // Create transport to communicate with Playwright MCP using the same config that works
    this.transport = new StdioClientTransport({
      command: 'npx',
      args: [
        '-y', '@playwright/mcp@latest',
        '--viewport-size', '1920x1080'
      ],
      stderr: 'inherit'
    });

    this.client = new Client({
      name: 'playread-search-client',
      version: '1.0.0'
    }, {
      capabilities: {}
    });

    await this.client.connect(this.transport);
    console.error('Connected directly to Playwright MCP');

    return this;
  }

  async navigate(url) {
    return this.client.request({
      method: 'tools/call',
      params: {
        name: 'browser_navigate',
        arguments: { url }
      }
    });
  }

  async snapshot() {
    return this.client.request({
      method: 'tools/call',
      params: {
        name: 'browser_snapshot',
        arguments: {}
      }
    });
  }

  async type(element, ref, text, submit = false) {
    return this.client.request({
      method: 'tools/call',
      params: {
        name: 'browser_type',
        arguments: { element, ref, text, submit }
      }
    });
  }

  async close() {
    if (this.client) {
      try {
        await this.client.request({
          method: 'tools/call',
          params: {
            name: 'browser_close',
            arguments: {}
          }
        });
      } catch (error) {
        // Ignore close errors
      }
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
    }
    if (this.transport) {
      await this.transport.close();
    }
  }
}

module.exports = { PlaywrightMCPDirect };