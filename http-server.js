#!/usr/bin/env node

const express = require('express');
const cors = require('cors');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
const { z } = require('zod');
const fs = require('fs');
const path = require('path');
const { PlaywrightMCPClient } = require('./index.js');

const flowsDir = path.join(__dirname, 'flows');
const PORT = process.env.PORT || 3000;

function getFlows() {
  if (!fs.existsSync(flowsDir)) {
    return [];
  }
  const files = fs.readdirSync(flowsDir);
  return files.filter(f => f.endsWith('.js')).map(f => path.basename(f, '.js'));
}

function getFlowSchema(flowName) {
  const schemas = {
    'fetch': {
      url: z.string().describe('The URL to fetch and extract content from')
    },
    'google-search': {
      query: z.string().describe('The search query')
    }
  };

  return schemas[flowName] || {};
}

async function executeFlow(flowName, args) {
  const flowPath = path.join(flowsDir, `${flowName}.js`);
  if (!fs.existsSync(flowPath)) {
    throw new Error(`Flow "${flowName}" not found`);
  }

  const flow = require(flowPath);
  if (typeof flow !== 'function') {
    throw new Error(`Flow "${flowName}" must export a function`);
  }

  const client = new PlaywrightMCPClient();

  try {
    await client.connect();
    const flowArgs = Object.values(args);
    const result = await flow(client, ...flowArgs);
    return result;
  } finally {
    await client.disconnect();
  }
}

function getServer() {
  const server = new McpServer({
    name: 'playread-http-server',
    version: '1.0.0'
  }, {
    capabilities: {
      tools: {}
    }
  });

  const flows = getFlows();
  flows.forEach(flowName => {
    const schema = getFlowSchema(flowName);
    server.tool(flowName, `Execute ${flowName} flow`, schema, async (args) => {
      try {
        const result = await executeFlow(flowName, args || {});
        return {
          content: [
            {
              type: 'text',
              text: result
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing flow "${flowName}": ${error.message}`
            }
          ],
          isError: true
        };
      }
    });
  });

  return server;
}

const app = express();

app.use(express.json());
app.use(cors({
  origin: '*',
  exposedHeaders: ['Mcp-Session-Id']
}));

app.post('/mcp', async (req, res) => {
  const server = getServer();
  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
    res.on('close', () => {
      transport.close();
      server.close();
    });
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error'
        },
        id: null
      });
    }
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  process.stdout.write(`Playread HTTP MCP server running on http://localhost:${PORT}\n`);
  process.stdout.write(`MCP endpoint: http://localhost:${PORT}/mcp\n`);
  process.stdout.write(`Health check: http://localhost:${PORT}/health\n`);
});

process.on('SIGINT', async () => {
  process.stdout.write('Shutting down server...\n');
  process.exit(0);
});
