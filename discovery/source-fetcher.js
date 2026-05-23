const axios = require('axios');

async function fetchRSS(url) {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: { 'Accept': 'application/rss+xml, application/xml, text/xml' },
    });
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(response.data)) !== null) {
      const content = match[1];
      const title = extractXML(content, 'title');
      const link = extractXML(content, 'link');
      const pubDate = extractXML(content, 'pubDate');
      const description = extractXML(content, 'description');
      if (title && link) items.push({ title, url: link, pubDate, description });
    }
    return items;
  } catch { return []; }
}

function extractXML(content, tag) {
  const match = content.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return match ? (match[1] || match[2] || '').trim() : '';
}

async function fetchRemotive(url) {
  try {
    const response = await axios.get(url, { timeout: 10000 });
    const jobs = response.data.jobs || [];
    return jobs.map(j => ({
      title: j.title,
      url: j.url,
      pubDate: j.publication_date,
      description: j.description ? j.description.replace(/<[^>]+>/g, '').slice(0, 300) : '',
      company: j.company_name,
    }));
  } catch { return []; }
}

async function fetchFromSource(query) {
  if (query.type === 'json') return fetchRemotive(query.url);
  return fetchRSS(query.url);
}

module.exports = { fetchFromSource };
