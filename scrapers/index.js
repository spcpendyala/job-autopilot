const { launchBrowser, sleep } = require('./browser');
const { scrapeIndeed } = require('./indeed');
const { scrapeLinkedIn } = require('./linkedin');
const { scrapeGoogleJobs } = require('./google-jobs');
const { scrapeMonster } = require('./monster');
const { scrapeGlassdoor } = require('./glassdoor');
const { scrapeUpwork } = require('./freelance/upwork');
const { scrapeFiverr } = require('./freelance/fiverr');
const { scrapeFreelancer } = require('./freelance/freelancer');
const { scrapePeoplePerHour } = require('./freelance/people-per-hour');

async function scrapeAllBoards({ roles, location, openToRemote, includeFreelance = false }) {
  const results = [];
  const roleList = (roles || []).slice(0, 3);

  for (const role of roleList) {
    console.log(`[scrapers] Scraping Indeed for: ${role}`);
    const indeedJobs = await scrapeIndeed({ role, location: location || 'Canada', maxJobs: 10 });
    results.push(...indeedJobs);
    console.log(`[scrapers] Indeed: ${indeedJobs.length} jobs`);
    await sleep(3000);

    console.log(`[scrapers] Scraping LinkedIn for: ${role}`);
    const liJobs = await scrapeLinkedIn({ role, location: location || 'Canada', maxJobs: 10 });
    results.push(...liJobs);
    console.log(`[scrapers] LinkedIn: ${liJobs.length} jobs`);
    await sleep(3000);

    console.log(`[scrapers] Scraping Google Jobs for: ${role}`);
    const googleJobs = await scrapeGoogleJobs({ role, location: location || 'Canada', maxJobs: 10 });
    results.push(...googleJobs);
    console.log(`[scrapers] Google Jobs: ${googleJobs.length} jobs`);
    await sleep(3000);

    if (includeFreelance) {
      console.log(`[scrapers] Scraping Upwork for: ${role}`);
      const upworkJobs = await scrapeUpwork({ role, maxJobs: 10 });
      results.push(...upworkJobs);
      console.log(`[scrapers] Upwork: ${upworkJobs.length} jobs`);
      await sleep(2000);

      console.log(`[scrapers] Scraping Fiverr for: ${role}`);
      const fiverrJobs = await scrapeFiverr({ role, maxJobs: 10 });
      results.push(...fiverrJobs);
      console.log(`[scrapers] Fiverr: ${fiverrJobs.length} jobs`);
      await sleep(2000);

      console.log(`[scrapers] Scraping Freelancer for: ${role}`);
      const flancerJobs = await scrapeFreelancer({ role, maxJobs: 10 });
      results.push(...flancerJobs);
      console.log(`[scrapers] Freelancer: ${flancerJobs.length} jobs`);
      await sleep(2000);
    }
  }

  // Deduplicate by URL
  const seen = new Set();
  return results.filter(j => {
    if (!j.url || seen.has(j.url)) return false;
    seen.add(j.url);
    return true;
  });
}

module.exports = { scrapeAllBoards };
