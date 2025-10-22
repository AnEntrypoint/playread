#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { PlaywrightMCPClient } = require('./index.js');

async function listFlows(flowsDir) {
  const files = fs.readdirSync(flowsDir);
  const flows = files.filter(f => f.endsWith('.js')).map(f => path.basename(f, '.js'));
  return flows;
}

async function loadFlow(flowsDir, flowName) {
  const flowPath = path.join(flowsDir, `${flowName}.js`);
  if (!fs.existsSync(flowPath)) {
    throw new Error(`Flow "${flowName}" not found at ${flowPath}`);
  }
  return require(flowPath);
}

async function runFlow(flowName, ...flowArgs) {
  const flowsDir = path.join(__dirname, 'flows');

  if (!fs.existsSync(flowsDir)) {
    console.error('Error: flows directory not found');
    process.exit(1);
  }

  const flow = await loadFlow(flowsDir, flowName);

  if (typeof flow !== 'function') {
    console.error(`Error: Flow "${flowName}" must export a function`);
    process.exit(1);
  }

  const client = new PlaywrightMCPClient();

  try {
    await client.connect();
    await flow(client, ...flowArgs);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  } finally {
    await client.disconnect();
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log('playread - Run Playwright MCP flows programmatically\n');
    console.log('Usage:');
    console.log('  npx playread <flow-name> [args...]  - Run a flow directly');
    console.log('  npx playread mcp                    - Start as MCP server\n');
    console.log('Available flows:');

    const flowsDir = path.join(__dirname, 'flows');
    if (fs.existsSync(flowsDir)) {
      const flows = await listFlows(flowsDir);
      flows.forEach(flow => console.log(`  - ${flow}`));
    } else {
      console.log('  (no flows directory found)');
    }

    process.exit(0);
  }

  if (args[0] === 'mcp') {
    require('./mcp-server.js');
    return;
  }

  const flowName = args[0];
  const flowArgs = args.slice(1);
  await runFlow(flowName, ...flowArgs);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
