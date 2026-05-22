require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { initDB, getAllApplications, updateApplicationStatus } = require('../services/db');
const { generateInterviewBrief } = require('../agents/interview-prep');
const { researchSalary } = require('../agents/salary-researcher');
const { saveInterviewBrief, saveSalaryBrief } = require('../services/output-writer');

const OUTPUTS_DIR = path.join(__dirname, '..', 'outputs');

function sanitize(str) {
  return (str || 'Unknown').replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-]/g, '');
}

function findOutputsFolder(company, role) {
  const prefix = `${sanitize(company)}-${sanitize(role)}`;
  if (!fs.existsSync(OUTPUTS_DIR)) return null;
  const match = fs.readdirSync(OUTPUTS_DIR).find(f => f.startsWith(prefix));
  return match ? path.join(OUTPUTS_DIR, match) : null;
}

function loadFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

async function main() {
  const jobId = process.argv[2];
  if (!jobId) {
    console.error('Usage: node scripts/prep.js <job-id>');
    console.error('  e.g. node scripts/prep.js J-1234567890');
    process.exit(1);
  }

  initDB();
  const applications = getAllApplications();
  const app = applications.find(a => a.id === jobId);

  if (!app) {
    console.error(`No application found with ID: ${jobId}`);
    process.exit(1);
  }

  const folder = findOutputsFolder(app.company, app.role);

  let jobDescription = null;
  let companyBrief = null;

  if (folder) {
    const jdRaw = loadFile(path.join(folder, 'job-description.md'));
    if (jdRaw) jobDescription = jdRaw;

    const briefRaw = loadFile(path.join(folder, 'company-brief.json'));
    if (briefRaw) {
      try { companyBrief = JSON.parse(briefRaw); } catch { /* continue with null */ }
    }
  }

  if (!jobDescription) {
    console.error('No job-description.md found. Run with --full first, or use --paste to process the job.');
    process.exit(1);
  }

  console.log(`Generating interview brief for ${app.company} — ${app.role}...`);
  const brief = await generateInterviewBrief(jobDescription, app.company, app.role, companyBrief);

  if (!folder) {
    console.error('No outputs folder found for this application. Run with --full first to generate one.');
    process.exit(1);
  }

  saveInterviewBrief(folder, brief, app.role, app.company);
  updateApplicationStatus(app.id, 'interview-prep-ready');

  console.log('Researching salary...');
  const salaryBrief = await researchSalary(app.role, app.company, null);
  saveSalaryBrief(folder, salaryBrief, app.role, app.company);
  console.log('💰 Salary brief saved.');

  const questionCount = (brief.likelyQuestions || []).length;
  const themes = (brief.keyThemesToEmphasize || []).slice(0, 3).join(', ');
  const mr = salaryBrief.marketRange || {};

  console.log(`\n✅ Interview brief ready: ${folder}/interview-prep.md`);
  console.log('\nQuick preview:');
  console.log(`  — ${questionCount} questions generated`);
  console.log(`  — Key themes: ${themes}`);
  console.log(`💰 Salary range: ${salaryBrief.recommendedAsk} (market: ${mr.low} – ${mr.high})`);
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
