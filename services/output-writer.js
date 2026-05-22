const fs = require('fs');
const path = require('path');

const OUTPUTS_DIR = path.join(__dirname, '..', 'outputs');

function sanitize(str) {
  return (str || 'Unknown').replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-]/g, '');
}

function makeFolderPath(company, role) {
  const date = new Date().toISOString().slice(0, 10);
  const base = `${sanitize(company)}-${sanitize(role)}-${date}`;
  let folderPath = path.join(OUTPUTS_DIR, base);
  if (!fs.existsSync(folderPath)) return folderPath;
  let i = 2;
  while (fs.existsSync(`${folderPath}-${i}`)) i++;
  return `${folderPath}-${i}`;
}

function buildScoreReport(fitScore, atsGaps) {
  const b = fitScore.scoringBreakdown;
  const lines = [];

  lines.push('══════════════════════════════════════════');
  lines.push(`FIT SCORE: ${fitScore.score}/10 — ${fitScore.verdict}`);
  lines.push(`${fitScore.oneLineSummary}`);
  lines.push('══════════════════════════════════════════');
  lines.push('');
  lines.push(`APPLY: ${fitScore.applyRecommendation ? 'YES' : 'NO'}`);
  lines.push('');
  lines.push('Top Matching Skills:');
  fitScore.topMatchingSkills.forEach(s => lines.push(`  - ${s}`));

  if (fitScore.keyGaps.length > 0) {
    lines.push('');
    lines.push('Key Gaps:');
    fitScore.keyGaps.forEach(g => lines.push(`  - ${g}`));
  }

  if (fitScore.missingKeywords.length > 0) {
    lines.push('');
    lines.push('Missing Keywords:');
    lines.push('  ' + fitScore.missingKeywords.join(', '));
  }

  if (fitScore.tailoringTips.length > 0) {
    lines.push('');
    lines.push('Tailoring Tips:');
    fitScore.tailoringTips.forEach((t, i) => lines.push(`  ${i + 1}. ${t}`));
  }

  lines.push('');
  lines.push('Score Breakdown:');
  lines.push(`  Skills Match:       ${b.skillsMatch}/10`);
  lines.push(`  Experience Level:   ${b.experienceLevel}/10`);
  lines.push(`  Tools Match:        ${b.toolsMatch}/10`);
  lines.push(`  Role Alignment:     ${b.roleAlignment}/10`);

  lines.push('');
  lines.push('ATS Keywords to Add:');
  if (atsGaps.criticalMissing.length > 0) {
    lines.push(`  Critical: ${atsGaps.criticalMissing.join(', ')}`);
  }
  if (atsGaps.niceToHaveMissing.length > 0) {
    lines.push(`  Nice to have: ${atsGaps.niceToHaveMissing.join(', ')}`);
  }

  if (atsGaps.keyPhrasesToUse.length > 0) {
    lines.push('');
    lines.push('Key Phrases to Use:');
    atsGaps.keyPhrasesToUse.forEach(p => lines.push(`  - ${p}`));
  }

  lines.push('');
  lines.push('══════════════════════════════════════════');
  return lines.join('\n');
}

function buildOtherRolesMd(company, otherRoles) {
  const roles = otherRoles?.otherRoles || [];
  if (roles.length === 0) {
    return `# Other Open Roles at ${company || 'Company'}\n\nNo other relevant roles found.\n`;
  }

  const lines = [`# Other Open Roles at ${company || 'Company'}`, ''];
  roles.forEach(r => {
    lines.push(`## ${r.title}`);
    if (r.url) lines.push(`**URL:** ${r.url}`);
    lines.push(`**Why relevant:** ${r.whyRelevant}`);
    lines.push('');
  });

  return lines.join('\n');
}

function saveApplicationPackage(data) {
  const { company, role, jobDescription, fitScore, atsGaps, resume, coverLetter, companyBrief, otherRoles } = data;

  if (!fs.existsSync(OUTPUTS_DIR)) {
    fs.mkdirSync(OUTPUTS_DIR, { recursive: true });
  }

  const folderPath = makeFolderPath(company, role);
  fs.mkdirSync(folderPath, { recursive: true });

  fs.writeFileSync(path.join(folderPath, 'resume.md'), resume, 'utf8');
  fs.writeFileSync(path.join(folderPath, 'cover-letter.md'), coverLetter, 'utf8');
  fs.writeFileSync(path.join(folderPath, 'job-description.md'), jobDescription, 'utf8');
  fs.writeFileSync(path.join(folderPath, 'company-brief.json'), JSON.stringify(companyBrief, null, 2), 'utf8');
  fs.writeFileSync(path.join(folderPath, 'other-roles.md'), buildOtherRolesMd(company, otherRoles), 'utf8');
  fs.writeFileSync(path.join(folderPath, 'score-report.md'), buildScoreReport(fitScore, atsGaps), 'utf8');

  return folderPath;
}

function buildInterviewBriefMd(role, company, brief) {
  const date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const lines = [];

  lines.push(`# Interview Prep — ${role || 'Role'} at ${company || 'Company'}`);
  lines.push(`Generated: ${date}`);
  lines.push('');
  lines.push('## Why This Role Exists');
  lines.push(brief.roleInContext || '');
  lines.push('');
  lines.push('## Likely Questions');

  // Group by category
  const byCategory = {};
  for (const q of (brief.likelyQuestions || [])) {
    const cat = (q.category || 'general').toLowerCase();
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(q);
  }
  for (const [cat, questions] of Object.entries(byCategory)) {
    lines.push('');
    lines.push(`### ${cat.charAt(0).toUpperCase() + cat.slice(1)}`);
    for (const q of questions) {
      lines.push('');
      lines.push(`**Q: ${q.question}**`);
      lines.push(`*Why they ask: ${q.whyTheyAsk}*`);
      lines.push(q.suggestedAnswer || '');
    }
  }

  lines.push('');
  lines.push('## Technical Topics to Brush Up On');
  (brief.technicalTopics || []).forEach(t => lines.push(`- ${t}`));

  lines.push('');
  lines.push('## Questions to Ask Them');
  for (const q of (brief.questionsToAskThem || [])) {
    lines.push('');
    lines.push(`**${q.question}**`);
    lines.push(`→ ${q.whyAsk}`);
  }

  const sal = brief.salaryContext || {};
  lines.push('');
  lines.push('## Salary Context');
  lines.push(`Range: ${sal.estimatedRange || 'N/A'}`);
  if (sal.anchorAdvice) lines.push(sal.anchorAdvice);
  if (sal.negotiationNote) lines.push(sal.negotiationNote);

  lines.push('');
  lines.push('## First 30 Days');
  lines.push(brief.thirtyDayPlan || '');

  lines.push('');
  lines.push('## Key Themes to Emphasize');
  (brief.keyThemesToEmphasize || []).forEach(t => lines.push(`- ${t}`));

  lines.push('');
  lines.push('## Watch For');
  (brief.redFlags || []).forEach(f => lines.push(`- ${f}`));

  lines.push('');
  lines.push("## Don't Bring Up Unless Asked");
  (brief.doNotMention || []).forEach(i => lines.push(`- ${i}`));

  return lines.join('\n');
}

function saveInterviewBrief(applicationFolder, brief, role, company) {
  if (!fs.existsSync(applicationFolder)) {
    throw new Error(`Application folder not found: ${applicationFolder}`);
  }
  const md = buildInterviewBriefMd(role, company, brief);
  fs.writeFileSync(path.join(applicationFolder, 'interview-prep.md'), md, 'utf8');
}

module.exports = { saveApplicationPackage, saveInterviewBrief };
