// How to get RSS feeds:
//   LinkedIn: Go to Jobs > Job Alerts > ... > Get RSS link
//   Indeed: https://www.indeed.com/rss?q=[title]&l=[location]
//   Google Jobs (via SerpAPI): needs API key — skip for now

const axios = require('axios');
const { isDuplicate } = require('../services/db');

async function scanRSSFeeds() {
  const raw = process.env.JOB_RSS_FEEDS || '';
  const feeds = raw.split(',').map(s => s.trim()).filter(Boolean);

  if (feeds.length === 0) {
    console.log('No RSS feeds configured. Add JOB_RSS_FEEDS to .env');
    return [];
  }

  const results = [];

  for (const feedUrl of feeds) {
    try {
      const response = await axios.get(feedUrl, {
        headers: { 'Accept': 'application/rss+xml, text/xml, */*' },
        timeout: 10000,
        responseType: 'text',
      });

      const xml = typeof response.data === 'string' ? response.data : String(response.data);
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      let match;

      while ((match = itemRegex.exec(xml)) !== null) {
        const block = match[1];

        const titleMatch = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/s);
        const linkMatch = block.match(/<link>(.*?)<\/link>/s) || block.match(/<guid[^>]*>(https?[^<]+)<\/guid>/s);
        const pubDateMatch = block.match(/<pubDate>(.*?)<\/pubDate>/s);
        const descMatch = block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description>([\s\S]*?)<\/description>/s);

        const title = ((titleMatch && (titleMatch[1] || titleMatch[2])) || '').trim();
        const link = ((linkMatch && (linkMatch[1] || linkMatch[2])) || '').trim();
        const pubDate = ((pubDateMatch && pubDateMatch[1]) || '').trim();
        const description = ((descMatch && (descMatch[1] || descMatch[2])) || '').trim();

        if (!link) continue;

        const posted = new Date(pubDate);
        if (isNaN(posted.getTime())) continue;
        const hoursSince = (Date.now() - posted.getTime()) / (1000 * 60 * 60);
        if (hoursSince > 48) continue;

        if (isDuplicate(link)) continue;

        results.push({ title, url: link, pubDate, description });
      }
    } catch (err) {
      console.error(`  ⚠️  Failed to fetch feed ${feedUrl}: ${err.message}`);
    }
  }

  return results;
}

module.exports = { scanRSSFeeds };
