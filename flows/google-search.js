module.exports = async function(client, query) {
  if (!query) {
    throw new Error('Search query is required');
  }

  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  await client.navigate(searchUrl);
  await client.waitFor(8);

  const snapshot = await client.snapshot();

  if (!snapshot.content || !snapshot.content[0]) {
    throw new Error('No snapshot content available');
  }

  const text = snapshot.content[0].text;
  const results = [];
  const allLinkMatches = text.match(/link "([^"]+)" \[ref=[^\]]+\] \[cursor=pointer\]:\s*\n\s*- \/url: (https?:\/\/[^\s]+)/g);

  if (allLinkMatches) {
    allLinkMatches.forEach(match => {
      const titleMatch = match.match(/link "([^"]+)"/);
      const urlMatch = match.match(/\/url: (https?:\/\/[^\s]+)/);

      if (titleMatch && urlMatch) {
        let url = urlMatch[1];
        const title = titleMatch[1];
        if (title &&
            !title.includes('Sign in') &&
            !title.includes('Gmail') &&
            !title.includes('Images') &&
            !title.includes('Accessibility') &&
            !title.includes('Support')) {
          results.push({ url, title });
        }
      }
    });
  }

  return JSON.stringify(results.slice(0, 10), null, 2);
};