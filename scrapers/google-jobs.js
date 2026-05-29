const { launchBrowser, newStealthPage } = require('./browser');

const TIMEOUT = 30000;

async function scrapeGoogleJobs({ role, location, maxJobs = 20 }) {
  const browser = await launchBrowser();
  try {
    const page = await newStealthPage(browser);
    const url = `https://www.google.com/search?q=${encodeURIComponent(role + ' jobs ' + location)}&ibp=htl;jobs&htivrt=jobs`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });

    // Detect CAPTCHA
    const title = await page.title();
    if (title.toLowerCase().includes('captcha') || title.toLowerCase().includes('unusual traffic')) {
      console.log('[google-jobs] blocked/captcha — returning empty');
      return [];
    }

    // Wait for job cards panel
    await page.waitForSelector('[data-hveid] li, [jscontroller] li[data-ved]', { timeout: TIMEOUT }).catch(() => {});

    const jobs = await page.evaluate((max) => {
      const cards = document.querySelectorAll('li[data-ved], li.iFjolb');
      const results = [];
      for (let i = 0; i < Math.min(cards.length, max); i++) {
        const card = cards[i];
        const titleEl = card.querySelector('div.BjJfJf, h2, .KLsYvd');
        const companyEl = card.querySelector('.nJlQNd, .vNEEBe, div[class*="company"]');
        const locationEl = card.querySelector('.Qk80Jf, div[class*="location"]');
        const descEl = card.querySelector('.HBvzbc, .YgLbBe');
        const linkEl = card.querySelector('a[jsname], a[data-ved]');
        if (!titleEl) continue;
        results.push({
          title: titleEl.textContent.trim(),
          company: companyEl ? companyEl.textContent.trim() : '',
          location: locationEl ? locationEl.textContent.trim() : '',
          description: descEl ? descEl.textContent.trim().slice(0, 300) : '',
          url: linkEl ? linkEl.href : '',
          source: 'google-jobs',
        });
      }
      return results;
    }, maxJobs);

    return jobs.filter(j => j.title);
  } catch (err) {
    console.log(`[google-jobs] failed: ${err.message}`);
    return [];
  } finally {
    await browser.close();
  }
}

module.exports = { scrapeGoogleJobs };
