const { PlaywrightMCPDirect } = require('./PlaywrightMCPDirect.js');

async function testSimple() {
  const client = new PlaywrightMCPDirect();

  try {
    await client.connect();
    console.log('Connected successfully');

    // Test navigation
    const navResult = await client.navigate('https://www.google.com');
    console.log('Navigation result:', JSON.stringify(navResult, null, 2));

    // Test snapshot
    const snapshotResult = await client.snapshot();
    console.log('Snapshot result:', JSON.stringify(snapshotResult, null, 2).substring(0, 1000));

  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await client.close();
    await client.disconnect();
  }
}

testSimple();