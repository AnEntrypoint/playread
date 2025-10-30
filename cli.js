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
    console.error(`Error: Flow "${flowName}" is not a function`);
    process.exit(1);
  }

  const client = new PlaywrightMCPClient();

  try {
    console.log('🌐 Connecting to browser via Playwright MCP...');
    await client.connect();
    console.log('✅ Browser connected successfully');
    
    console.log('🚀 Executing flow:', flowName);
    if (flowArgs.length > 0) {
      console.log('📝 With arguments:', flowArgs.join(', '));
    }
    
    const result = await flow(client, ...flowArgs);
    
    // Display the results
    if (result !== undefined && result !== null) {
      console.log('\n📊 --- RESULTS ---');
      if (typeof result === 'string') {
        console.log(result);
      } else if (Array.isArray(result) && result.length === 0) {
        console.log('No results returned');
      } else {
        console.log(JSON.stringify(result, null, 2));
      }
    } else {
      console.log('\n✅ Flow completed successfully (no results returned)');
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error executing flow:', error.message);
    
    // Check if it's a connection error and provide helpful guidance
    if (error.message.includes('ENOENT') || error.message.includes('spawn') || error.message.includes('npx')) {
      console.error('\n💡 This appears to be a connection issue with the Playwright MCP server.');
      console.error('\n📋 To fix this, try one of the following:');
      console.error('   1. Install Playwright browsers:');
      console.error('      npx playwright install');
      console.error('   2. Install the Playwright MCP package:');
      console.error('      npm install -g @playwright/mcp');
      console.error('   3. Use MCP server mode instead:');
      console.error('      node cli.js mcp');
      console.error('   4. Check if @playwright/mcp is accessible:');
      console.error('      npx -y @playwright/mcp@latest --help');
    }
    
    process.exit(1);
  } finally {
    await client.disconnect();
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log('🔧 Playread CLI - Web content extraction and automation');
    console.log('\nUsage:');
    console.log('  node cli.js <flow-name> [arguments...]');
    console.log('  node cli.js mcp                    # Start MCP server mode');
    console.log('  node cli.js --help                 # Show this help');
    console.log('\nAvailable flows:');
    const flowsDir = path.join(__dirname, 'flows');
    if (fs.existsSync(flowsDir)) {
      const flows = await listFlows(flowsDir);
      flows.forEach(flow => {
        console.log('  ' + flow);
      });
      
      if (flows.includes('google-search')) {
        console.log('\nExamples:');
        console.log('  node cli.js google-search test query');
        console.log('  node cli.js fetch https://example.com');
      }
    } else {
      console.log('  No flows found');
    }
    process.exit(0);
  }

  if (args[0] === 'mcp') {
    console.log('🚀 Starting Playread MCP server...');
    require('./mcp-server.js');
    return;
  }

  const flowName = args[0];
  const flowArgs = args.slice(1);
  await runFlow(flowName, ...flowArgs);
}

main().catch(error => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});
