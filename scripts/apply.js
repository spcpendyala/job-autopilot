require('dotenv').config();

const { initDB, isDuplicate, saveApplication, updateDriveUrl } = require('../services/db');
const { syncApplicationToDrive } = require('../services/drive');
const { fetchJobDescription } = require('../services/fetcher');
const { scoreJobFit } = require('../agents/fit-scorer');
const { scanATSGaps } = require('../agents/ats-scanner');
const { tailorResume } = require('../agents/resume-tailor');
const { generateCoverLetter } = require('../agents/cover-letter');
const { getCompanyBrief } = require('../agents/company-brief');
const { findOtherRoles } = require('../agents/other-roles');
const { saveApplicationPackage } = require('../services/output-writer');

function printResults(fitResult, atsResult) {
  const b = fitResult.scoringBreakdown;

  console.log('\n══════════════════════════════════════════');
  console.log(`🎯 FIT SCORE: ${fitResult.score}/10 — ${fitResult.verdict}`);
  console.log(`💡 ${fitResult.oneLineSummary}`);
  console.log('══════════════════════════════════════════\n');

  console.log(`✅ APPLY: ${fitResult.applyRecommendation ? 'YES' : 'NO'}\n`);

  console.log('🎯 Top Matching Skills:');
  fitResult.topMatchingSkills.forEach(s => console.log(`  • ${s}`));

  if (fitResult.keyGaps.length > 0) {
    console.log('\n⚠️  Key Gaps:');
    fitResult.keyGaps.forEach(g => console.log(`  • ${g}`));
  }

  if (fitResult.missingKeywords.length > 0) {
    console.log('\n🔍 Missing Keywords:');
    console.log('  ' + fitResult.missingKeywords.join(', '));
  }

  if (fitResult.tailoringTips.length > 0) {
    console.log('\n📝 Tailoring Tips:');
    fitResult.tailoringTips.forEach((t, i) => console.log(`  ${i + 1}. ${t}`));
  }

  console.log('\n📊 Score Breakdown:');
  console.log(`  Skills Match:       ${b.skillsMatch}/10`);
  console.log(`  Experience Level:   ${b.experienceLevel}/10`);
  console.log(`  Tools Match:        ${b.toolsMatch}/10`);
  console.log(`  Role Alignment:     ${b.roleAlignment}/10`);

  console.log('\n🔑 ATS Keywords to Add:');
  if (atsResult.criticalMissing.length > 0) {
    console.log(`  Critical: ${atsResult.criticalMissing.join(', ')}`);
  }
  if (atsResult.niceToHaveMissing.length > 0) {
    console.log(`  Nice to have: ${atsResult.niceToHaveMissing.join(', ')}`);
  }

  console.log('\n══════════════════════════════════════════\n');
}

async function main() {
  // Strip flags before positional arg extraction
  const flags = new Set(process.argv.slice(2).filter(a => a.startsWith('--')));
  const args = process.argv.slice(2).filter(a => !a.startsWith('--'));

  const pasteMode = flags.has('--paste');
  const fullMode = flags.has('--full');

  const url = pasteMode ? null : args[0];
  const company = args[pasteMode ? 0 : 1];
  const role = args[pasteMode ? 1 : 2];

  if (!pasteMode && !url) {
    console.log('Usage: node scripts/apply.js [--full] <job-url> [company] [role]');
    console.log('       node scripts/apply.js [--full] --paste [company] [role]');
    process.exit(0);
  }

  initDB();
  let driveFolderUrl = null;

  if (!pasteMode && isDuplicate(url)) {
    console.log('Already processed. Skipping.');
    process.exit(0);
  }

  let jd;
  if (pasteMode) {
    jd = require('fs').readFileSync('/dev/stdin', 'utf-8');
  } else {
    console.log('Fetching job description...');
    jd = await fetchJobDescription(url);
  }

  console.log('Scoring fit with Claude...');
  const [fitResult, atsResult] = await Promise.all([
    scoreJobFit(jd, role, company),
    scanATSGaps(jd),
  ]);

  printResults(fitResult, atsResult);

  if (fullMode) {
    console.log('Generating application package...');
    const [resume, coverLetter, companyBrief, otherRoles] = await Promise.all([
      tailorResume(jd, role, company, atsResult),
      generateCoverLetter(jd, role, company, fitResult.score),
      getCompanyBrief(company, jd),
      findOtherRoles(company, url || ''),
    ]);

    console.log('Saving to outputs folder...');
    const folderPath = saveApplicationPackage({
      company,
      role,
      jobUrl: url || `paste-${Date.now()}`,
      jobDescription: jd,
      fitScore: fitResult,
      atsGaps: atsResult,
      resume,
      coverLetter,
      companyBrief,
      otherRoles,
    });

    console.log(`\n✅ Package saved to: ${folderPath}`);
    console.log('📁 Files: resume.md, cover-letter.md, job-description.md, company-brief.json, other-roles.md, score-report.md');

    console.log('☁️  Syncing to Google Drive...');
    const driveResult = await syncApplicationToDrive(folderPath, company, role);
    if (driveResult) {
      driveFolderUrl = driveResult.folderUrl;
      console.log(`✅ Drive folder: ${driveFolderUrl}`);
    } else {
      console.log('⏭  Drive sync skipped.');
    }

    const roles = otherRoles?.otherRoles || [];
    if (roles.length > 0) {
      console.log(`\n🔍 Other open roles at ${company || 'company'}:`);
      roles.forEach(r => console.log(`  • ${r.title}${r.url ? ' — ' + r.url : ''}`));
    }
  }

  saveApplication({
    job_url: url || `paste-${Date.now()}`,
    company: company || null,
    role: role || null,
    fit_score: fitResult.score,
    verdict: fitResult.verdict,
    apply_recommendation: fitResult.applyRecommendation,
    raw_score_json: JSON.stringify(fitResult),
    drive_folder_url: driveFolderUrl,
  });

  console.log('\nSaved to database.');
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
