module.exports = async function(client, cartoonName) {
  if (!cartoonName) {
    throw new Error('Cartoon name is required. Usage: playpen wcostream "<cartoon name>"');
  }

  await client.navigate('https://wcostream.tv');

  await client.waitFor(null, null, 5);

  const snapshot = await client.snapshot();
  const pageText = snapshot.content[0].text;

  // Look for search functionality
  let searchBoxRef = null;
  const searchMatch = pageText.match(/(?:textbox|combobox).*?search.*?\[ref=(e\d+)\]/i);
  if (searchMatch) {
    searchBoxRef = searchMatch[1];
  } else {
    // Look for any input field
    const inputMatch = pageText.match(/(textbox|combobox).*?\[ref=(e\d+)\]/i);
    if (inputMatch) {
      searchBoxRef = inputMatch[2];
    }
  }

  if (searchBoxRef) {
    await client.type('Search box', searchBoxRef, cartoonName, true);
    await client.waitFor(null, null, 3);
  } else {
    // Try navigation to search or list page
    await client.navigate('https://wcostream.tv/anime-list');
    await client.waitFor(null, null, 3);
  }

  const resultsSnapshot = await client.snapshot();
  const resultsText = resultsSnapshot.content[0].text;
  const lines = resultsText.split('\n');

  const allResults = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Look for links that might be cartoons
    const linkMatch = line.match(/link.*?"([^"]+)".*?\[ref=(e\d+)\]/i);
    if (linkMatch) {
      const title = linkMatch[1].trim();
      const ref = linkMatch[2];
      
      // Filter out non-cartoon links
      if (title.length > 3 && 
          !title.toLowerCase().includes('home') &&
          !title.toLowerCase().includes('search') &&
          !title.toLowerCase().includes('login') &&
          !title.toLowerCase().includes('register') &&
          !title.toLowerCase().includes('contact') &&
          !title.toLowerCase().includes('privacy') &&
          !title.toLowerCase().includes('terms')) {
        
        // Calculate similarity to search term
        const similarity = calculateSimilarity(title.toLowerCase(), cartoonName.toLowerCase());
        
        allResults.push({
          title,
          ref,
          similarity
        });
      }
    }
  }

  // Sort by similarity and remove duplicates
  const uniqueResults = [];
  const seenTitles = new Set();
  
  allResults.sort((a, b) => b.similarity - a.similarity);
  
  for (const result of allResults) {
    if (!seenTitles.has(result.title.toLowerCase())) {
      seenTitles.add(result.title.toLowerCase());
      uniqueResults.push(result);
    }
  }

  if (uniqueResults.length > 0) {
    const bestMatch = uniqueResults[0];
    
    await client.click('Cartoon link', bestMatch.ref);
    await client.waitFor(null, null, 3);

    const finalSnapshot = await client.snapshot();
    const finalText = finalSnapshot.content[0].text;

    // Extract episodes
    const episodes = [];
    const episodeLines = finalText.split('\n');
    
    for (const line of episodeLines) {
      const episodeMatch = line.match(/(episode|season|s\d+e\d+|chapter).*?\[ref=(e\d+)\]/i);
      if (episodeMatch) {
        episodes.push({
          title: line.trim(),
          ref: episodeMatch[1]
        });
      }
    }

    await client.close();

    return JSON.stringify({
      success: true,
      cartoon: bestMatch.title,
      searchQuery: cartoonName,
      similarity: bestMatch.similarity,
      episodes: episodes.slice(0, 10),
      allResults: uniqueResults.slice(0, 20),
      message: `Successfully found and opened ${bestMatch.title}`
    }, null, 2);

  } else {
    await client.close();

    return JSON.stringify({
      success: false,
      message: `No results found for "${cartoonName}"`,
      searchQuery: cartoonName,
      suggestion: 'Try a different cartoon name or check spelling'
    }, null, 2);
  }
};

function calculateSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}