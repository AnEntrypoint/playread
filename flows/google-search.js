module.exports = async function(client, query) {
  const searchQuery = query || 'Playwright automation testing';
  console.error(`Starting Google search for: "${searchQuery}"`);

  try {
    await client.navigate('https://www.google.com');

    // More human-like delays and interaction patterns
    await new Promise(resolve => setTimeout(resolve, 2000));

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
      throw new Error('Could not find search box in page snapshot');
    }

    await client.type('Search box', searchBoxMatch[1], searchQuery, true);

    // Simple wait for results to load
    await new Promise(resolve => setTimeout(resolve, 5000));

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
    console.error('Results snapshot preview:', resultsText.substring(0, 1000));

    // Dynamic parsing that works with actual Playwright MCP structure
    console.error('Starting dynamic result parsing...');

    const allResults = [];
    const lines = resultsText.split('\n');

    // Find all heading patterns at level 3 that are actual search results
    const headingIndices = [];
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('heading "') && lines[i].includes('[level=3]')) {
        // Check if this heading is part of a search result (has URL nearby)
        const searchRadius = 10;
        let hasUrlNearby = false;
        for (let j = Math.max(0, i - searchRadius); j <= Math.min(lines.length - 1, i + searchRadius); j++) {
          if (lines[j].includes('/url:') && lines[j].includes('http')) {
            hasUrlNearby = true;
            break;
          }
        }

        if (hasUrlNearby) {
          headingIndices.push(i);
        }
      }
    }

    console.error(`Found ${headingIndices.length} search result headings to process`);

    // Process each heading and find associated content
    headingIndices.forEach((headingIndex) => {
      const headingLine = lines[headingIndex];
      const titleMatch = headingLine.match(/heading "([^"]+)" \[level=3\]/);

      if (titleMatch) {
        let title = titleMatch[1].trim();
        let url = null;
        let description = '';
        let source = '';

        // Skip navigation and UI elements
        if (title.startsWith('button "') ||
            title.startsWith('link "') ||
            title === 'Next' ||
            title.includes('More results') ||
            title.includes('About this result') ||
            title.includes('Feedback') ||
            title.includes('People also search for') ||
            title.length < 5) {
          return;
        }

        // Look for URL and source in surrounding context
        const searchRadius = 15;
        for (let j = Math.max(0, headingIndex - searchRadius); j <= Math.min(lines.length - 1, headingIndex + searchRadius); j++) {
          // Extract URL
          if (lines[j].includes('/url:') && lines[j].includes('http')) {
            const urlMatch = lines[j].match(/\/url:\s*(https?:\/\/[^\s\]]+)/);
            if (urlMatch) {
              url = urlMatch[1];
            }
          }

          // Extract source (GitHub, Anthropic, etc.)
          if (lines[j].includes('GitHub') || lines[j].includes('Anthropic') ||
              lines[j].includes('Medium') || lines[j].includes('YouTube') ||
              lines[j].includes('Wikipedia') || lines[j].includes('Stack Overflow')) {
            const sourceMatch = lines[j].match(/(GitHub|Anthropic|Medium|YouTube|Wikipedia|Stack Overflow)/);
            if (sourceMatch && !source) {
              source = sourceMatch[1];
            }
          }
        }

        // Extract description from surrounding lines - look for generic elements with emphasis/text
        const descLines = [];
        for (let j = headingIndex + 1; j < Math.min(lines.length, headingIndex + 20); j++) {
          const line = lines[j].trim();

          // Stop at next search result (heading with URL)
          if (line.includes('heading "') && line.includes('[level=3]')) {
            // Check if this is the next search result
            let isNextResult = false;
            for (let k = Math.max(0, j - 5); k <= Math.min(lines.length - 1, j + 5); k++) {
              if (lines[k].includes('/url:') && lines[k].includes('http')) {
                isNextResult = true;
                break;
              }
            }
            if (isNextResult) break;
          }

          // Look for meaningful content - emphasis, text, or standalone content
          if (line.length > 10 &&
              (line.includes('emphasis') ||
               line.includes('text:') ||
               (!line.includes('[') && !line.includes('ref=') &&
                !line.includes('button') && !line.includes('link')))) {

            // Clean the line
            let cleanLine = line
              .replace(/^[-\s]*text:\s*/, '')
              .replace(/^[-\s]*emphasis.*?:\s*/, '')
              .replace(/\[ref=[^\]]+\]/g, '')
              .replace(/\[cursor=[^\]]+\]/g, '')
              .replace(/\[level=\d+\]/g, '')
              .replace(/^-\s*/, '')
              .trim();

            if (cleanLine.length > 5 && !cleanLine.includes('About this result') &&
                !cleanLine.includes('More results') && !cleanLine.includes('Feedback')) {
              descLines.push(cleanLine);
            }
          }

          // Stop if we have enough description
          if (descLines.length >= 5) {
            break;
          }
        }

        // Build description
        if (descLines.length > 0) {
          description = descLines
            .filter(line => line.length > 3)
            .join(' ')
            .substring(0, 500);
        }

        // Add source to description if available
        if (source && description) {
          description = `[${source}] ${description}`;
        } else if (source && !description) {
          description = `Source: ${source}`;
        }

        console.error(`Parsed result: "${title.substring(0, 50)}..." | URL: ${url ? 'Yes' : 'No'} | Desc: ${description.length > 0 ? 'Yes' : 'No'}`);

        if (title && (url || description)) {
          allResults.push({
            title: title,
            url: url || null,
            description: description || null
          });
        }
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
    console.error('Google search flow completed');
  }
};