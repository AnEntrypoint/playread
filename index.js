const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const crypto = require('crypto');

class PlaywrightMCPClient {
  constructor(sessionId = null) {
    this.client = null;
    this.transport = null;
    this.sessionId = sessionId || crypto.randomBytes(8).toString('hex');
    this.connected = false;
    this.connectPromise = null;
    this.operationLocks = [];
  }

  async connect() {
    if (this.connected) {
      throw new Error(`Session ${this.sessionId} is already connected`);
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.connectPromise = this._performConnect();
    return this.connectPromise;
  }

  async _performConnect() {
    try {
      const path = require('path');
      const playwrightMcpPath = path.join(require.resolve('@playwright/mcp'), '..', 'cli.js');
      const args = ['--browser', 'chromium', '--no-sandbox'];
      const env = { ...process.env };

      const chromiumPath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || process.env.CHROMIUM_BIN;
      if (chromiumPath) {
        env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH = chromiumPath;
        args.push('--executable-path', chromiumPath);
      }

      this.transport = new StdioClientTransport({
        command: 'node',
        args: [playwrightMcpPath, ...args],
        stderr: 'inherit',
        env
      });

      this.client = new Client({
        name: `playwright-mcp-client-${this.sessionId}`,
        version: '1.0.0'
      }, {
        capabilities: {}
      });

      await this.client.connect(this.transport);
      this.connected = true;

      return this;
    } catch (error) {
      this.connectPromise = null;
      this.connected = false;
      throw error;
    }
  }

  async listTools() {
    const response = await this.client.listTools();
    return response.tools;
  }

  async callTool(name, args = {}) {
    if (!this.connected) {
      throw new Error(`Session ${this.sessionId} is not connected. Call connect() first.`);
    }

    try {
      const response = await this.client.callTool({
        name,
        arguments: args
      });
      return response;
    } catch (error) {
      throw new Error(`Tool call ${name} failed in session ${this.sessionId}: ${error.message}`);
    }
  }

  async navigate(url) {
    return this.callTool('browser_navigate', { url });
  }

  async snapshot() {
    return this.callTool('browser_snapshot');
  }

  async click(element, ref) {
    return this.callTool('browser_click', { element, ref });
  }

  async type(element, ref, text, submit = false, slowly = false) {
    return this.callTool('browser_type', { element, ref, text, submit, slowly });
  }

  async evaluate(func) {
    return this.callTool('browser_evaluate', { function: func });
  }

  async screenshot(filename, type = 'png', fullPage = false, element = null, ref = null) {
    const args = { type, fullPage };
    if (filename) args.filename = filename;
    if (element) args.element = element;
    if (ref) args.ref = ref;
    return this.callTool('browser_take_screenshot', args);
  }

  async close() {
    return this.callTool('browser_close');
  }

  async resize(width, height) {
    return this.callTool('browser_resize', { width, height });
  }

  async consoleMessages(onlyErrors = false) {
    return this.callTool('browser_console_messages', { onlyErrors });
  }

  async handleDialog(accept, promptText = null) {
    const args = { accept };
    if (promptText) args.promptText = promptText;
    return this.callTool('browser_handle_dialog', args);
  }

  async fileUpload(paths = []) {
    return this.callTool('browser_file_upload', { paths });
  }

  async fillForm(fields) {
    return this.callTool('browser_fill_form', { fields });
  }

  async install() {
    return this.callTool('browser_install');
  }

  async pressKey(key) {
    return this.callTool('browser_press_key', { key });
  }

  async navigateBack() {
    return this.callTool('browser_navigate_back');
  }

  async networkRequests() {
    return this.callTool('browser_network_requests');
  }

  async hover(element, ref) {
    return this.callTool('browser_hover', { element, ref });
  }

  async selectOption(element, ref, values) {
    return this.callTool('browser_select_option', { element, ref, values });
  }

  async tabs(action, index = null) {
    const args = { action };
    if (index !== null) args.index = index;
    return this.callTool('browser_tabs', args);
  }

  async waitFor(text = null, textGone = null, time = null) {
    const args = {};
    if (text) args.text = text;
    if (textGone) args.textGone = textGone;
    if (time) args.time = time;
    return this.callTool('browser_wait_for', args);
  }

  async drag(startElement, startRef, endElement, endRef) {
    return this.callTool('browser_drag', {
      startElement,
      startRef,
      endElement,
      endRef
    });
  }

  async disconnect() {
    try {
      if (this.client) {
        await this.client.close();
      }
      if (this.transport) {
        await this.transport.close();
      }
    } finally {
      this.connected = false;
      this.client = null;
      this.transport = null;
      this.connectPromise = null;
    }
  }

  getSessionInfo() {
    return {
      sessionId: this.sessionId,
      connected: this.connected,
      hasClient: !!this.client,
      hasTransport: !!this.transport
    };
  }
}

module.exports = { PlaywrightMCPClient };
