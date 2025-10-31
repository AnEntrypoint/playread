const { PlaywrightMCPClient } = require('./index.js');

async function testDoubleConnect() {
  console.log('\n=== Test: Prevent double connection ===');
  const client = new PlaywrightMCPClient('test-session-1');

  try {
    await client.connect();
    console.log('✓ First connect succeeded');

    try {
      await client.connect();
      console.log('✗ FAILED: Second connect should have thrown');
    } catch (error) {
      console.log('✓ Second connect rejected:', error.message);
    }
  } finally {
    await client.disconnect();
  }
}

async function testOperationWithoutConnect() {
  console.log('\n=== Test: Prevent operations without connect ===');
  const client = new PlaywrightMCPClient('test-session-2');

  try {
    await client.navigate('https://example.com');
    console.log('✗ FAILED: Operation should have thrown');
  } catch (error) {
    console.log('✓ Operation rejected:', error.message);
  }
}

async function testSessionIsolation() {
  console.log('\n=== Test: Session isolation ===');
  const client1 = new PlaywrightMCPClient('isolated-1');
  const client2 = new PlaywrightMCPClient('isolated-2');

  try {
    await client1.connect();
    await client2.connect();

    const info1 = client1.getSessionInfo();
    const info2 = client2.getSessionInfo();

    console.log('✓ Client 1 session:', info1.sessionId);
    console.log('✓ Client 2 session:', info2.sessionId);

    if (info1.sessionId === info2.sessionId) {
      console.log('✗ FAILED: Sessions should have different IDs');
    } else {
      console.log('✓ Sessions have unique IDs');
    }

    if (info1.connected && info2.connected) {
      console.log('✓ Both clients are connected');
    } else {
      console.log('✗ FAILED: Both clients should be connected');
    }
  } finally {
    await client1.disconnect();
    await client2.disconnect();
  }
}

async function testCleanDisconnect() {
  console.log('\n=== Test: Clean disconnect ===');
  const client = new PlaywrightMCPClient('test-session-3');

  try {
    await client.connect();
    console.log('✓ Connected');

    await client.disconnect();
    console.log('✓ Disconnected');

    const info = client.getSessionInfo();
    if (!info.connected && !info.hasClient && !info.hasTransport) {
      console.log('✓ Session cleaned up properly');
    } else {
      console.log('✗ FAILED: Session not fully cleaned');
    }

    try {
      await client.navigate('https://example.com');
      console.log('✗ FAILED: Should not operate after disconnect');
    } catch (error) {
      console.log('✓ Operations blocked after disconnect:', error.message);
    }
  } catch (error) {
    console.log('✗ Test error:', error.message);
  }
}

async function testConnectionPromiseReuse() {
  console.log('\n=== Test: Connection promise reuse (prevent race conditions) ===');
  const client = new PlaywrightMCPClient('test-session-4');

  try {
    const promise1 = client.connect();
    const promise2 = client.connect();

    if (promise1 === promise2) {
      console.log('✓ Same promise returned for concurrent connects');
    } else {
      console.log('✗ FAILED: Different promises returned');
    }

    await promise1;
    console.log('✓ Connection completed');

    const info = client.getSessionInfo();
    if (info.connected) {
      console.log('✓ Client is connected');
    }
  } finally {
    await client.disconnect();
  }
}

async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   Concurrent Playwright Session Collision Detection Tests  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    await testDoubleConnect();
    await testOperationWithoutConnect();
    await testSessionIsolation();
    await testCleanDisconnect();
    await testConnectionPromiseReuse();

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    All tests completed                      ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('\n✗ Fatal test error:', error);
  }
}

runAllTests();
