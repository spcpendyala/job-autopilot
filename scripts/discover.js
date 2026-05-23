require('dotenv').config();
const { runDiscovery } = require('../discovery/auto-scorer');

async function main() {
  console.log('\n🔍 Job AutoPilot — Discovery Run\n');
  const { discovered, scored, queued } = await runDiscovery();
  console.log('\n📊 Results:');
  console.log(`  Fetched:  ${discovered} new listings`);
  console.log(`  Scored:   ${scored} relevant listings`);
  console.log(`  Queued:   ${queued} packages ready for approval`);
  if (queued > 0) console.log('\n  → Open dashboard to review');
}

main().catch(console.error);
