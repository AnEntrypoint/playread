const { spawn } = require('child_process');
const { createInterface } = require('readline');

class PlaywrightClient {
  constructor() {
    this.process = null;
    this.requestId = 1;
    this.pendingRequests = new Map();
    this.rl = null;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      // Spawn Playwright MCP with working configuration
      this.process = spawn('npx', [
        '-y', '@playwright/mcp@latest',
        '--viewport-size', '1920x1080'
      ], {
        stdio: ['pipe', 'pipe', 'inherit']
      });

      if (!this.process.stdout || !this.process.stdin) {
        reject(new Error('Failed to create process streams'));
        return;
      }

      this.rl = createInterface({
        input: this.process.stdout,
        output: this.process.stdin
      });

      // Handle responses from Playwright MCP
      this.rl.on('line', (line) => {
        try {
          const response = JSON.parse(line);
          const { id } = response;
          if (this.pendingRequests.has(id)) {
            const { resolve, reject } = this.pendingRequests.get(id);
            this.pendingRequests.delete(id);
            if (response.error) {
              reject(new Error(response.error.message || 'Unknown error'));
            } else {
              resolve(response.result);
            }
          }
        } catch (error) {
          console.error('Error parsing response:', error.message);
        }
      });

      this.process.on('error', reject);
      this.process.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Process exited with code ${code}`));
        }
      });

      // Wait a moment for the process to start
      setTimeout(() => {
        console.error('Connected to Playwright MCP');
        resolve();
      }, 2000);
    });
  }

  async request(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.requestId++;
      const request = {
        jsonrpc: '2.0',
        id,
        method,
        params
      };

      this.pendingRequests.set(id, { resolve, reject });

      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error('Request timeout'));
      }, 30000);

      try {
        this.process.stdin.write(JSON.stringify(request) + '\n');
      } catch (error) {
        clearTimeout(timeout);
        this.pendingRequests.delete(id);
        reject(error);
      }
    });
  }

  async navigate(url) {
    return this.request('tools/call', {
      name: 'browser_navigate',
      arguments: { url }
    });
  }

  async snapshot() {
    return this.request('tools/call', {
      name: 'browser_snapshot',
      arguments: {}
    });
  }

  async type(element, ref, text, submit = false) {
    return this.request('tools/call', {
      name: 'browser_type',
      arguments: { element, ref, text, submit }
    });
  }

  async close() {
    try {
      await this.request('tools/call', {
        name: 'browser_close',
        arguments: {}
      });
    } catch (error) {
      // Ignore close errors
    }

    if (this.process) {
      this.process.kill();
    }
  }
}

module.exports = { PlaywrightClient };