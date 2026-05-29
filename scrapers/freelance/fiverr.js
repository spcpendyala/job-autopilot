const { launchBrowser, newStealthPage } = require('../browser');

const TIMEOUT = 30000;

async function scrapeFiverr({ role, maxJobs = 20 }) {
  const browser = await launchBrowser();
  try {
    const page = await newStealthPage(browser);
    const url = `https://www.fiverr.com/search/gigs?query=${encodeURIComponent(role)}&source=top-bar`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
    await page.waitForSelector('.gig-card-layout, [class*="GigCard"], .gig-wrapper', { timeout: TIMEOUT }).catch(() => {});

    const jobs = await page.evaluate((max) => {
      const cards = document.querySelectorAll('.gig-card-layout, [class*="GigCard"], .gig-wrapper');
      const results = [];
      for (let i = 0; i < Math.min(cards.length, max); i++) {
        const card = cards[i];
        const titleEl = card.querySelector('h3, .text-body-2, [class*="title"]');
        const sellerEl = card.querySelector('.seller-name, [class*="seller"]');
        const priceEl = card.querySelector('.price, [class*="price"]');
        const ratingEl = card.querySelector('.rating-score, [class*="rating"]');
        const linkEl = card.querySelector('a[href*="/gig"], a[href*="/"]');
        if (!titleEl) continue;
        results.push({
          title: titleEl.textContent.trim(),
          sellerName: sellerEl ? sellerEl.textContent.trim() : '',
          price: priceEl ? priceEl.textContent.trim() : '',
          rating: ratingEl ? ratingEl.textContent.trim() : '',
          url: linkEl ? (linkEl.href.startsWith('http') ? linkEl.href : 'https://www.fiverr.com' + linkEl.getAttribute('href')) : '',
          source: 'fiverr',
          type: 'freelance',
        });
      }
      return results;
    }, maxJobs);

    return jobs.filter(j => j.url);
  } catch (err) {
    console.log(`[fiverr] failed: ${err.message}`);
    return [];
  } finally {
    await browser.close();
  }
}

module.exports = { scrapeFiverr };
