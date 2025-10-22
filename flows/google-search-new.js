module.exports = async function(client, query) {
  const searchQuery = query || 'Playwright automation testing';
  console.error(`Starting Google search for: "${searchQuery}"`);

  try {
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
        const text = checkSnapshot.content && checkSnapshot.content[0] ? checkSnapshot.content[0].text : '';

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

    // Dynamic parsing that works with Playwright MCP structure
    console.error('Starting dynamic result parsing...');

    const allResults = [];
    const lines = resultsText.split('\n');

    // Find all heading patterns at level 3
    const headingIndices = [];
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('heading "') && lines[i].includes('[level=3]')) {
        headingIndices.push(i);
      }
    }

    console.error(`Found ${headingIndices.length} headings to process`);

    // Process each heading and find associated content
    headingIndices.forEach((headingIndex) => {
      const headingLine = lines[headingIndex];
      const titleMatch = headingLine.match(/heading "([^"]+)" \[level=3\]/);

      if (titleMatch) {
        let title = titleMatch[1].trim();
        let url = null;
        let description = '';

        // Skip navigation and UI elements
        if (title.startsWith('button "') ||
            title.startsWith('link "') ||
            title === 'Next' ||
            title.includes('More results') ||
            title.includes('About this result') ||
            title.includes('Feedback') ||
            title.length < 5) {
          return;
        }

        // Look for URL in surrounding context (before and after heading)
        const searchRadius = 15;
        for (let j = Math.max(0, headingIndex - searchRadius); j <= Math.min(lines.length - 1, headingIndex + searchRadius); j++) {
          if (lines[j].includes('/url:') && lines[j].includes('http')) {
            const urlMatch = lines[j].match(/\/url:\s*(https?:\/\/[^\s\]]+)/);
            if (urlMatch) {
              url = urlMatch[1];
              break;
            }
          }
        }

        // Extract description from surrounding lines
        const descLines = [];
        for (let j = headingIndex + 1; j < Math.min(lines.length, headingIndex + 10); j++) {
          const line = lines[j].trim();

          // Stop at next heading
          if (line.includes('heading "') && line.includes('[level=')) {
            break;
          }

          // Look for meaningful content patterns
          if (line.length > 5 &&
              (line.includes('YouTube') ||
               line.includes('Spotify') ||
               line.includes('Wikipedia') ||
               line.includes('Rolling Stone') ||
               line.includes('text:') ||
               line.includes('http') ||
               line.includes('emphasis'))) {
            descLines.push(line);
          }

          // Stop if we have enough description
          if (descLines.length >= 3) {
            break;
          }
        }

        // Clean up description from YAML-like structure
        if (descLines.length > 0) {
          description = descLines
            .map(line => line
              .replace(/^[-\s]*text:\s*/, '')
              .replace(/^[-\s]*emphasis.*?:\s*/, '')
              .replace(/\[ref=[^\]]+\]/g, '')
              .replace(/\[cursor=[^\]]+\]/g, '')
              .trim())
            .filter(line => line.length > 3)
            .join(' ')
            .substring(0, 300);
        }

        console.error(`Parsed result: "${title.substring(0, 50)}..."`);

        allResults.push({
          title: title,
          url: url || null,
          description: description || null
        });
      }
    });

    console.log(JSON.stringify({
      query: searchQuery,
      totalResults: allResults.length,
      results: allResults
    }, null, 2));

  } catch (error) {
    console.error('Google search error:', error.message);
    throw error;
  } finally {
    // Note: Don't close client here - let the connection pool manage it
    console.error('Google search flow completed');
  }
};