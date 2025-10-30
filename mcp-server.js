#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const fs = require('fs');
const path = require('path');
const { PlaywrightMCPClient } = require('./index.js');

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
