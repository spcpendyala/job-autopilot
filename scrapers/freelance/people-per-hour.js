const { launchBrowser, newStealthPage } = require('../browser');

const TIMEOUT = 30000;

function roleToSlug(role) {
  return role.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function scrapePeoplePerHour({ role, maxJobs = 20 }) {
  const browser = await launchBrowser();
  try {
    const page = await newStealthPage(browser);
    const slug = roleToSlug(role);
    const url = `https://www.peopleperhour.com/freelance-${slug}-jobs`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
    await page.waitForSelector('.listings-feed__item, [class*="listing-item"], [class*="HourlieListing"]', { timeout: TIMEOUT }).catch(() => {});

    const jobs = await page.evaluate((max) => {
      const cards = document.querySelectorAll('.listings-feed__item, [class*="listing-item"], [class*="card--hourlie"]');
      const results = [];
      for (let i = 0; i < Math.min(cards.length, max); i++) {
        const card = cards[i];
        const titleEl = card.querySelector('h2, h3, [class*="title"]');
        const budgetEl = card.querySelector('[class*="price"], [class*="budget"], [class*="rate"]');
        const skillsEl = card.querySelectorAll('[class*="skill"], [class*="tag"]');
        const linkEl = card.querySelector('a[href]');
        if (!titleEl) continue;
        const href = linkEl ? linkEl.getAttribute('href') : '';
        results.push({
          title: titleEl.textContent.trim(),
          budget: budgetEl ? budgetEl.textContent.trim() : '',
          skills: Array.from(skillsEl).slice(0, 5).map(s => s.textContent.trim()).filter(Boolean),
          url: href ? (href.startsWith('http') ? href : 'https://www.peopleperhour.com' + href) : '',
          source: 'peopleperhour',
          type: 'freelance',
        });
      }
      return results;
    }, maxJobs);

    return jobs.filter(j => j.title);
  } catch (err) {
    console.log(`[peopleperhour] failed: ${err.message}`);
    return [];
  } finally {
    await browser.close();
  }
}

module.exports = { scrapePeoplePerHour };
