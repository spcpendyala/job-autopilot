const fs = require('fs');
const path = require('path');

function sanitize(str) {
  return (str || 'Unknown').replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-]/g, '');
}

function makeFolderPath(userId, company, role) {
  const outBase = path.join(__dirname, '..', 'data', 'users', userId, 'outputs');
  if (!fs.existsSync(outBase)) fs.mkdirSync(outBase, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  const base = `${sanitize(company)}-${sanitize(role)}-${date}`;
  let folderPath = path.join(outBase, base);
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

function saveApplicationPackage(userId, data) {
  const { company, role, jobDescription, fitScore, atsGaps, resume, coverLetter, companyBrief, otherRoles } = data;

  const folderPath = makeFolderPath(userId || 'default', company, role);
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

function saveInterviewBrief(userId, applicationFolder, brief, role, company) {
  if (!fs.existsSync(applicationFolder)) {
    throw new Error(`Application folder not found: ${applicationFolder}`);
  }
  const md = buildInterviewBriefMd(role, company, brief);
  fs.writeFileSync(path.join(applicationFolder, 'interview-prep.md'), md, 'utf8');
}

function buildSalaryBriefMd(role, company, brief) {
  const date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const mr = brief.marketRange || {};
  const ns = brief.negotiationScript || {};
  const lines = [];

  lines.push(`# Salary Brief — ${role || 'Role'} at ${company || 'Company'}`);
  lines.push(`Generated: ${date}`);
  lines.push('');
  lines.push('## Market Range');
  lines.push(`Low: ${mr.low} | Mid: ${mr.mid} | High: ${mr.high} (${mr.currency})`);
  lines.push(`Data: ${mr.dataQuality}`);
  lines.push('');
  lines.push('## Your Numbers');
  lines.push(`**Ask:** ${brief.recommendedAsk}`);
  lines.push(`**Anchor:** ${brief.anchorPoint}`);
  lines.push(`**Walk Away:** ${brief.walkAwayNumber}`);
  lines.push('');
  lines.push('## Why These Numbers');
  lines.push(brief.reasoning || '');
  lines.push('');
  lines.push('## What to Say');
  lines.push('');
  lines.push('**When asked "What are your salary expectations?"**');
  lines.push(ns.openingLine || '');
  lines.push('');
  lines.push('**When they counter below your ask:**');
  lines.push(ns.counterOffer || '');
  lines.push('');
  lines.push('**To close or defer:**');
  lines.push(ns.closingLine || '');
  lines.push('');
  lines.push('## Equity');
  lines.push(brief.equityNote || '');
  lines.push('');
  lines.push('## Also Negotiate');
  (brief.benefitsToNegotiate || []).forEach(b => lines.push(`- ${b}`));
  lines.push('');
  lines.push('## Red Lines');
  (brief.redLines || []).forEach(r => lines.push(`- ${r}`));
  lines.push('');
  lines.push('## Market Context');
  lines.push(brief.marketContext || '');

  return lines.join('\n');
}

function saveSalaryBrief(userId, applicationFolder, brief, role, company) {
  if (!fs.existsSync(applicationFolder)) {
    throw new Error(`Application folder not found: ${applicationFolder}`);
  }
  const md = buildSalaryBriefMd(role, company, brief);
  fs.writeFileSync(path.join(applicationFolder, 'salary-brief.md'), md, 'utf8');
  fs.writeFileSync(path.join(applicationFolder, 'salary-brief.json'), JSON.stringify(brief, null, 2), 'utf8');
}

module.exports = { saveApplicationPackage, saveInterviewBrief, saveSalaryBrief };
