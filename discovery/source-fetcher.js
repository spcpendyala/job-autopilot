const axios = require('axios');

const USER_AGENT = 'Mozilla/5.0 (compatible; JobAutoPilot/1.0)';

async function fetchRSS(url) {
  const response = await axios.get(url, {
    timeout: 10000,
    maxRedirects: 5,
    headers: {
      'Accept': 'application/rss+xml, application/xml, text/xml',
      'User-Agent': USER_AGENT,
    },
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
}

function extractXML(content, tag) {
  const match = content.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return match ? (match[1] || match[2] || '').trim() : '';
}

async function fetchJobicy(url) {
  const response = await axios.get(url, { timeout: 10000, headers: { 'User-Agent': USER_AGENT } });
  const jobs = response.data.jobs || [];
  return jobs.map(j => ({
    title: j.jobTitle || j.title || '',
    url: j.url || j.jobUrl || '',
    pubDate: j.pubDate || '',
    description: j.jobDescription ? j.jobDescription.replace(/<[^>]+>/g, '').slice(0, 300) : '',
    company: j.companyName || j.company || '',
  })).filter(j => j.url);
}

async function fetchArbeitnow(url) {
  const response = await axios.get(url, { timeout: 10000, headers: { 'User-Agent': USER_AGENT } });
  const jobs = response.data.data || [];
  return jobs.map(j => ({
    title: j.title || '',
    url: j.url || '',
    pubDate: j.created_at || '',
    description: j.description ? j.description.replace(/<[^>]+>/g, '').slice(0, 300) : '',
    company: j.company_name || '',
  })).filter(j => j.url);
}

async function fetchRemotive(url) {
  const response = await axios.get(url, { timeout: 10000, headers: { 'User-Agent': USER_AGENT } });
  const jobs = response.data.jobs || [];
  return jobs.map(j => ({
    title: j.title,
    url: j.url,
    pubDate: j.publication_date,
    description: j.description ? j.description.replace(/<[^>]+>/g, '').slice(0, 300) : '',
    company: j.company_name,
  }));
}

async function fetchTheMuse(url) {
  const response = await axios.get(url, { timeout: 10000, headers: { 'User-Agent': USER_AGENT } });
  const results = response.data.results || [];
  return results
    .map(j => ({
      title: j.title || '',
      url: j.refs?.landing_page || '',
      pubDate: j.publication_date || '',
      company: j.company?.name || '',
      description: '',
    }))
    .filter(j => j.url);
}

async function fetchAdzuna(url) {
  const response = await axios.get(url, { timeout: 10000, headers: { 'User-Agent': USER_AGENT } });
  const results = response.data.results || [];
  return results
    .map(j => ({
      title: j.title || '',
      url: j.redirect_url || '',
      pubDate: j.created || '',
      company: j.company?.display_name || '',
      description: j.description ? j.description.slice(0, 300) : '',
    }))
    .filter(j => j.url);
}

// Hacker News Who's Hiring — runs at most once per 28 days (rate limited via metadata)
async function fetchHNHiring(query) {
  // Lazy require to avoid circular dependencies at module load
  let getMetadata, setMetadata;
  try {
    const db = require('../services/db');
    getMetadata = db.getMetadata;
    setMetadata = db.setMetadata;
  } catch {
    getMetadata = () => null;
    setMetadata = () => {};
  }

  const lastScan = getMetadata('last_hn_scan');
  if (lastScan) {
    const daysSince = (Date.now() - new Date(lastScan).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < 28) {
      console.log(`[source-fetcher] HN Who's Hiring: skipping — last scan ${Math.floor(daysSince)}d ago`);
      return [];
    }
  }

  // Get the latest "Ask HN: Who is hiring?" thread
  const threadRes = await axios.get(
    'https://hn.algolia.com/api/v1/search?tags=ask_hn,story&query=Ask+HN+Who+is+hiring&hitsPerPage=1',
    { timeout: 10000 }
  );
  const hit = threadRes.data.hits?.[0];
  if (!hit) return [];
  const threadId = hit.objectID;

  // Fetch comments from that thread
  const commentsRes = await axios.get(
    `https://hn.algolia.com/api/v1/search?tags=comment,story_${threadId}&hitsPerPage=100`,
    { timeout: 15000 }
  );
  const comments = commentsRes.data.hits || [];
  const roles = (query.roles || []).map(r => r.toLowerCase());

  const jobs = [];
  for (const c of comments) {
    const text = (c.comment_text || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!text || text.length < 50) continue;
    if (!roles.some(r => text.toLowerCase().includes(r))) continue;

    // First line typically: "Company | Location | Remote/Onsite | Stack | ..."
    const firstLine = text.split('\n')[0].trim();
    const company = (firstLine.split('|')[0] || firstLine.split(':')[0] || 'Unknown').trim().slice(0, 60);
    jobs.push({
      title: firstLine.slice(0, 120),
      url: `https://news.ycombinator.com/item?id=${c.objectID}`,
      pubDate: c.created_at || '',
      company,
      description: text.slice(0, 300),
    });
  }

  setMetadata('last_hn_scan', new Date().toISOString());
  console.log(`[source-fetcher] HN Who's Hiring: ${jobs.length} relevant comments from thread ${threadId}`);
  return jobs;
}

async function fetchFromSource(query) {
  try {
    if (query.type === 'hn') return await fetchHNHiring(query);
    if (query.type === 'json') {
      if (query.source === 'themuse') return await fetchTheMuse(query.url);
      if (query.source === 'adzuna') return await fetchAdzuna(query.url);
      if (query.source === 'jobicy') return await fetchJobicy(query.url);
      if (query.source === 'arbeitnow') return await fetchArbeitnow(query.url);
      return await fetchRemotive(query.url);
    }
    return await fetchRSS(query.url);
  } catch (err) {
    console.log(`[source-fetcher] SKIP ${query.source}: ${err.message}`);
    return [];
  }
}

module.exports = { fetchFromSource };
