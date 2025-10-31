module.exports = async function(client, url) {
  if (!url) {
    throw new Error('URL is required. Usage: playpen fetch <url>');
  }

  await client.navigate(url);

  await client.waitFor(null, null, 2);

  const result = await client.evaluate(`() => {
    function extractMainContent() {
      const candidates = [];

      const mainEl = document.querySelector('main');
      if (mainEl) candidates.push(mainEl);

      const articleEl = document.querySelector('article');
      if (articleEl) candidates.push(articleEl);

      const contentSelectors = [
        '[role="main"]',
        '.content',
        '.main-content',
        '.article-content',
        '.post-content',
        '#content',
        '#main-content'
      ];

      contentSelectors.forEach(sel => {
        const el = document.querySelector(sel);
        if (el) candidates.push(el);
      });

      if (candidates.length === 0) {
        candidates.push(document.body);
      }

      let bestCandidate = candidates[0];
      let maxScore = 0;

      candidates.forEach(el => {
        const textLength = el.innerText?.length || 0;
        const pCount = el.querySelectorAll('p').length;
        const score = textLength + (pCount * 100);
        if (score > maxScore) {
          maxScore = score;
          bestCandidate = el;
        }
      });

      return bestCandidate;
    }

    function cleanText(text) {
      return text
        .replace(/\\s+/g, ' ')
        .replace(/\\n\\s*\\n/g, '\\n\\n')
        .trim();
    }

    function extractStructuredText(element) {
      const parts = [];

      const title = document.querySelector('h1');
      if (title) {
        parts.push('# ' + title.innerText.trim());
        parts.push('');
      }

      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc && metaDesc.content) {
        parts.push(metaDesc.content.trim());
        parts.push('');
      }

      const headings = element.querySelectorAll('h2, h3');
      const paragraphs = element.querySelectorAll('p');
      const lists = element.querySelectorAll('ul, ol');
      const codeBlocks = element.querySelectorAll('pre, code');

      const allElements = Array.from(element.querySelectorAll('h2, h3, p, ul, ol, pre, code'))
        .filter(el => {
          const text = el.innerText?.trim() || '';
          return text.length > 0 && text.length < 5000;
        })
        .sort((a, b) => {
          const posA = a.getBoundingClientRect().top;
          const posB = b.getBoundingClientRect().top;
          return posA - posB;
        });

      allElements.forEach(el => {
        const text = cleanText(el.innerText || '');
        if (!text) return;

        if (el.tagName === 'H2') {
          parts.push('\\n## ' + text);
        } else if (el.tagName === 'H3') {
          parts.push('\\n### ' + text);
        } else if (el.tagName === 'PRE' || el.tagName === 'CODE') {
          if (el.parentElement?.tagName !== 'PRE') {
            parts.push('\\n\`\`\`\\n' + text + '\\n\`\`\`');
          }
        } else if (el.tagName === 'UL' || el.tagName === 'OL') {
          const items = Array.from(el.querySelectorAll('li'))
            .map(li => '- ' + cleanText(li.innerText))
            .join('\\n');
          parts.push(items);
        } else {
          parts.push(text);
        }
      });

      return parts.join('\\n');
    }

    const mainContent = extractMainContent();
    const structuredText = extractStructuredText(mainContent);

    const lines = structuredText.split('\\n');
    const filteredLines = [];
    const seen = new Set();

    lines.forEach(line => {
      const normalized = line.trim().toLowerCase();
      if (normalized && !seen.has(normalized)) {
        seen.add(normalized);
        filteredLines.push(line);
      }
    });

    return {
      url: window.location.href,
      title: document.title,
      content: filteredLines.join('\\n').substring(0, 50000)
    };
  }`);

  const response = result.content[0].text;
  let data;

  try {
    data = JSON.parse(response);
  } catch (e) {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(`Failed to extract JSON from: ${response}`);
    }
    data = JSON.parse(jsonMatch[0]);
  }

  await client.close();

  return JSON.stringify(data, null, 2);
};
