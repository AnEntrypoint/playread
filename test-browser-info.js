const { PlaywrightMCPClient } = require('./index.js');

async function testBrowserInfo() {
  const client = new PlaywrightMCPClient();
  await client.connect();

  try {
    // Navigate to Google
    await client.navigate('https://www.google.com');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get browser info
    const browserInfo = await client.evaluate(`
      () => ({
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screenResolution: screen.width + 'x' + screen.height,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        webdriver: navigator.webdriver,
        chrome: window.chrome,
        permissions: navigator.permissions
      })
    `);

    console.log('Browser info:', JSON.stringify(browserInfo, null, 2));

    // Take a snapshot to see what we get
    const snapshot = await client.snapshot();
    console.log('Snapshot length:', snapshot.content?.[0]?.text?.length || 0);

  } finally {
    await client.close();
  }
}

testBrowserInfo().catch(console.error);