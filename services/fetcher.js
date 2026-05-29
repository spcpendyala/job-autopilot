const axios = require('axios');

async function fetchJobDescription(url) {
  // LinkedIn always blocks automated access — fail fast before hitting Jina
  if (url && url.includes('linkedin.com')) {
    throw new Error('LINKEDIN_BLOCKED');
  }

  const response = await axios.get(`https://r.jina.ai/${url}`, {
    headers: { 'Accept': 'text/plain' },
    timeout: 15000,
  });

  const text = response.data || '';
  if (text.length < 500) {
    throw new Error('Could not extract job description. Please paste it manually.');
  }

  return text.trim().slice(0, 8000);
}

module.exports = { fetchJobDescription };
