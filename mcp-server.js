#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const fs = require('fs');
const path = require('path');
const { SimplePlaywrightClient } = require('./SimplePlaywrightClient.js');

const flowsDir = path.join(__dirname, 'flows');

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
      description: 'Fetch and extract main content from a web page URL',
      inputSchema: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'The URL to fetch and extract content from'
          }
        },
        required: ['url']
      }
    },
    'google-search': {
      description: 'Perform a Google search and extract results',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query'
          }
        },
        required: ['query']
      }
    }
  };

  return schemas[flowName] || {
    description: `Execute ${flowName} flow`,
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  };
}

// Create fresh client for each request to avoid bot detection
async function getFreshClient() {
  const client = new SimplePlaywrightClient();
  await client.connect();
  console.error('New fresh Simple Playwright client connected');
  return client;
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

  // Use fresh client to avoid bot detection
  const client = await getFreshClient();
  let result = '';

  const originalLog = console.log;
  console.log = (...args) => {
    result += args.join(' ') + '\n';
  };

  try {
    const flowArgs = [];
    if (flowName === 'fetch' && args.url) {
      flowArgs.push(args.url);
    } else if (flowName === 'google-search' && args.query) {
      flowArgs.push(args.query);
    }

    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Flow execution timeout')), 30000);
    });

    await Promise.race([
      flow(client, ...flowArgs),
      timeoutPromise
    ]);

    return result;
  } finally {
    console.log = originalLog;
    // Close the client to clean up resources
    try {
      await client.close();
    } catch (error) {
      console.error('Error closing client:', error.message);
    }
  }
}

const server = new Server(
  {
    name: 'playpen-mcp-server',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  const flows = getFlows();
  const tools = flows.map(flowName => {
    const schema = getFlowSchema(flowName);
    return {
      name: flowName,
      description: schema.description,
      inputSchema: schema.inputSchema
    };
  });

  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const result = await executeFlow(name, args || {});
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
          text: `Error executing flow "${name}": ${error.message}`
        }
      ],
      isError: true
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  process.stderr.write('Playpen MCP server running on stdio\n');
}

main().catch(error => {
  process.stderr.write(`Fatal error: ${error.message}\n`);
  process.exit(1);
});
