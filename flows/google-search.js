module.exports = async function(client, query) {
  await client.navigate('https://www.google.com');

  const snapshot = await client.snapshot();

  // Handle different snapshot formats
  let snapshotText = '';
  if (snapshot.content && snapshot.content[0] && snapshot.content[0].text) {
    snapshotText = snapshot.content[0].text;
  } else if (snapshot.text) {
    snapshotText = snapshot.text;
  } else if (typeof snapshot === 'string') {
    snapshotText = snapshot;
  }

  console.error('Snapshot text length:', snapshotText.length);
  console.error('Snapshot preview:', snapshotText.substring(0, 200));

  // Try multiple patterns to find search box
  const searchPatterns = [
    /combobox "Search".*?\[ref=(e\d+)\]/,
    /combobox.*Search.*\[ref=(e\d+)\]/,
    /input.*Search.*\[ref=(e\d+)\]/,
    /search.*\[ref=(e\d+)\]/i
  ];

  let searchBoxMatch = null;
  for (const pattern of searchPatterns) {
    searchBoxMatch = snapshotText.match(pattern);
    if (searchBoxMatch) {
      console.error('Found search box with pattern:', pattern.toString());
      break;
    }
  }

  if (!searchBoxMatch) {
    // As a fallback, try to extract any ref with search-related content
    const refMatch = snapshotText.match(/\[ref=(e\d+)\]/);
    if (refMatch) {
      console.error('Using fallback ref extraction');
      searchBoxMatch = refMatch;
    } else {
      throw new Error('Could not find search box in page snapshot');
    }
  }

  const searchQuery = query || 'Playwright automation testing';
  await client.type('Search box', searchBoxMatch[1], searchQuery, true);

  // Wait for results with intelligent polling instead of fixed 30s wait
    let attempts = 0;
    let resultsFound = false;

    while (attempts < 10 && !resultsFound) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      attempts++;

      try {
        const checkSnapshot = await client.snapshot();
        const text = checkSnapshot.content[0].text;

        // Check if search results have loaded
        if (text.includes('About ') && text.includes(' results') ||
            text.includes('Web results') ||
            text.match(/\d+,\d+,\d+/)) {
          resultsFound = true;
          break;
        }
      } catch (error) {
        console.error(`Error checking for results on attempt ${attempts}: ${error.message}`);
      }
    }

  const results = await client.snapshot();

  // Handle different snapshot formats for results
  let resultsText = '';
  if (results.content && results.content[0] && results.content[0].text) {
    resultsText = results.content[0].text;
  } else if (results.text) {
    resultsText = results.text;
  } else if (typeof results === 'string') {
    resultsText = results;
  }

  console.error('Results snapshot length:', resultsText.length);

  // Check for Google reCAPTCHA / bot detection
  if (resultsText.includes('I\'m not a robot') ||
      resultsText.includes('reCAPTCHA') ||
      resultsText.includes('unusual traffic') ||
      resultsText.includes('checkbox "I\'m not a robot"') ||
      resultsText.includes('/sorry/index')) {

    console.error('Google reCAPTCHA detected - automated search blocked');

    // Return informative results instead of throwing error
    const fallbackResults = [
      {
        title: "Google Search Blocked by reCAPTCHA",
        url: null,
        description: "Automated searches are currently blocked by Google's anti-bot protection. This is a common issue with web scraping tools. Try again later or use a different search approach."
      },
      {
        title: "Alternative: Use Search APIs",
        url: "https://developers.google.com/custom-search/v1/introduction",
        description: "Consider using Google's Custom Search API for reliable programmatic access to search results."
      },
      {
        title: "Alternative: DuckDuckGo",
        url: "https://duckduckgo.com/",
        description: "DuckDuckGo is generally more permissive of automated searches and provides similar functionality."
      }
    ];

    console.log(JSON.stringify({
      query: searchQuery,
      totalResults: fallbackResults.length,
      results: fallbackResults,
      warning: "Google reCAPTCHA detected - automated search blocked"
    }, null, 2));

    return;
  }

  const allResults = [];
  const lines = resultsText.split('\n');
  let inDescriptionSection = false;
  let descriptionDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headingMatch = line.match(/heading "([^"]+)" \[level=3\]/);

    if (headingMatch) {
      const title = headingMatch[1];
      let url = null;
      const descriptionParts = [];

      for (let j = Math.max(0, i - 10); j <= i + 50 && j < lines.length; j++) {
        if (lines[j].includes('/url:') && lines[j].includes('http')) {
          const urlMatch = lines[j].match(/\/url:\s*(https?:\/\/[^\s]+)/);
          if (urlMatch && !url) {
            url = urlMatch[1];
          }
        }

        if (j > i) {
          const indent = lines[j].match(/^(\s*)/)[1].length;

          if (lines[j].includes('- emphasis') || lines[j].includes('- text:')) {
            const emphasisMatch = lines[j].match(/emphasis.*:\s*(.+?)$/);
            const textMatch = lines[j].match(/text:\s*(.+?)$/);

            if (emphasisMatch && emphasisMatch[1].trim().length > 5) {
              descriptionParts.push(emphasisMatch[1].trim());
            } else if (textMatch && textMatch[1].trim().length > 5) {
              descriptionParts.push(textMatch[1].trim());
            }
          }

          if (lines[j].includes('heading') && j !== i) {
            break;
          }

          if (descriptionParts.join(' ').length > 250) {
            break;
          }
        }
      }

      const description = descriptionParts.join(' ').substring(0, 500).trim();

      if (title && title !== 'Next' && !title.includes('More results')) {
        allResults.push({
          title,
          url: url || null,
          description: description || null
        });
      }
    }
  }

  console.log(JSON.stringify({
    query: searchQuery,
    totalResults: allResults.length,
    results: allResults
  }, null, 2));

  await client.close();
};
