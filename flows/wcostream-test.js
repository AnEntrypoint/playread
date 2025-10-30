module.exports = async function(client, cartoonName) {
  console.log('=== WCO Stream Test Flow ===');
  console.log('Searching for:', cartoonName);
  
  try {
    // Step 1: Navigate to wcostream.tv
    console.log('Step 1: Navigating to wcostream.tv...');
    await client.navigate('https://wcostream.tv');
    await client.waitFor(null, null, 5);
    
    // Step 2: Take snapshot and analyze
    console.log('Step 2: Taking page snapshot...');
    const snapshot = await client.snapshot();
    const pageText = snapshot.content[0].text;
    
    // Log first few lines for debugging
    const lines = pageText.split('\n');
    console.log('Page has', lines.length, 'lines');
    console.log('First 10 lines:');
    lines.slice(0, 10).forEach((line, i) => {
      console.log(`${i + 1}: ${line.substring(0, 100)}`);
    });
    
    // Step 3: Look for search functionality
    console.log('Step 3: Looking for search functionality...');
    let searchBoxRef = null;
    
    // Search for any input field
    for (const line of lines) {
      const match = line.match(/(textbox|combobox).*?\[ref=(e\d+)\]/i);
      if (match) {
        searchBoxRef = match[2];
        console.log(`Found input field: ${match[1]} with ref: ${searchBoxRef}`);
        break;
      }
    }
    
    if (searchBoxRef) {
      console.log('Step 4: Attempting to search...');
      await client.type('Search input', searchBoxRef, cartoonName, true);
      await client.waitFor(null, null, 3);
      
      // Take results snapshot
      const resultsSnapshot = await client.snapshot();
      const resultsText = resultsSnapshot.content[0].text;
      
      console.log('Search completed. Results page has', resultsText.split('\n').length, 'lines');
      
      // Look for any links in results
      const linkMatches = resultsText.match(/link.*?"([^"]+)".*?\[ref=(e\d+)\]/gi) || [];
      console.log('Found', linkMatches.length, 'potential links');
      
      if (linkMatches.length > 0) {
        console.log('First few links:');
        linkMatches.slice(0, 5).forEach((link, i) => {
          console.log(`${i + 1}: ${link}`);
        });
      }
    } else {
      console.log('No search functionality found');
    }
    
    await client.close();
    
    return JSON.stringify({
      success: true,
      message: 'Test flow completed',
      cartoonName: cartoonName,
      pageLines: lines.length,
      searchBoxFound: !!searchBoxRef,
      timestamp: new Date().toISOString()
    }, null, 2);
    
  } catch (error) {
    console.error('Flow error:', error.message);
    
    try {
      await client.close();
    } catch (closeError) {
      // Ignore close errors
    }
    
    return JSON.stringify({
      success: false,
      error: error.message,
      cartoonName: cartoonName
    }, null, 2);
  }
};