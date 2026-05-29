require('dotenv').config();
const { scrapeAllBoards } = require('../scrapers/index');

async function main() {
  console.log('Starting scraper test...');
  const jobs = await scrapeAllBoards({
    roles: ['Operations Manager', 'TAM'],
    location: 'Toronto, ON',
    openToRemote: true,
    includeFreelance: false,
  });
  console.log(`\nFound ${jobs.length} jobs:`);
  jobs.forEach(j => console.log(`  [${j.source}] ${j.title} @ ${j.company || 'N/A'}`));
  if (jobs.length < 5) {
    console.warn(`\nWARNING: Only ${jobs.length} jobs found (expected ≥5)`);
    process.exit(1);
  }
  console.log('\nScraper test passed.');
}
main().catch(err => { console.error(err.message); process.exit(1); });
