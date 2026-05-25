require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { initDB } = require('../services/db');
const { analyzeApplicationPatterns } = require('../agents/rejection-analyzer');

const OUTPUTS_DIR = path.join(__dirname, '..', 'outputs');

function gradeEmoji(grade) {
  if (grade === 'A') return '🟢';
  if (grade === 'B') return '🟡';
  return '🔴';
}

function findingEmoji(severity) {
  if (severity === 'critical') return '🔴';
  if (severity === 'warning') return '🟡';
  return '🔵';
}

async function main() {
  initDB();

  let result;
  try {
    result = await analyzeApplicationPatterns();
  } catch (err) {
    console.error('Analysis failed:', err.message);
    process.exit(1);
  }

  if (result.insufficientData) {
    console.log(result.message);
    process.exit(0);
  }

  const { overallGrade, responseRate, keyFindings, topIssues, whatIsWorking, roleAlignmentAnalysis, recommendations, predictedResponseRateIfFixed, motivationalNote, computedStats } = result;

  const emoji = gradeEmoji(overallGrade);
  const lines = [];

  lines.push('══════════════════════════════════════════');
  lines.push('📊 APPLICATION PATTERN ANALYSIS');
  lines.push(`   ${computedStats.total} applications | ${computedStats.responseRate}% response rate`);
  lines.push(`   Overall Grade: ${overallGrade}`);
  lines.push('══════════════════════════════════════════');
  lines.push('');

  lines.push('🔍 KEY FINDINGS');
  lines.push('');
  if (keyFindings && keyFindings.length > 0) {
    for (const f of keyFindings) {
      lines.push(`  ${findingEmoji(f.severity)} ${f.finding}`);
      lines.push(`  Evidence: ${f.evidence}`);
      lines.push('');
    }
  }

  lines.push('⚠️  TOP ISSUES TO FIX');
  lines.push('');
  if (topIssues && topIssues.length > 0) {
    topIssues.forEach((issue, i) => {
      lines.push(`  ${i + 1}. ${issue.issue}`);
      lines.push(`     Impact: ${issue.impact}`);
      lines.push(`     Fix: ${issue.fix}`);
      lines.push('');
    });
  }

  lines.push('✅ WHAT IS WORKING');
  if (whatIsWorking && whatIsWorking.length > 0) {
    whatIsWorking.forEach(w => lines.push(`  • ${w}`));
  }
  lines.push('');

  lines.push('🎯 ROLE ALIGNMENT');
  lines.push(`  ${roleAlignmentAnalysis}`);
  lines.push('');

  lines.push('📋 RECOMMENDATIONS');
  lines.push('');
  lines.push('  Do Today:');
  (recommendations?.immediate || []).forEach(r => lines.push(`  • ${r}`));
  lines.push('');
  lines.push('  This Week:');
  (recommendations?.thisWeek || []).forEach(r => lines.push(`  • ${r}`));
  lines.push('');
  lines.push('  Strategic:');
  (recommendations?.strategic || []).forEach(r => lines.push(`  • ${r}`));
  lines.push('');

  const predRate = typeof predictedResponseRateIfFixed === 'number'
    ? `${predictedResponseRateIfFixed}%`
    : predictedResponseRateIfFixed;
  lines.push(`📈 PREDICTED RESPONSE RATE IF FIXED: ${predRate}`);
  lines.push('');
  lines.push(`💬 ${motivationalNote}`);
  lines.push('══════════════════════════════════════════');

  const output = lines.join('\n');
  console.log(output);

  // Save markdown report
  if (!fs.existsSync(OUTPUTS_DIR)) {
    fs.mkdirSync(OUTPUTS_DIR, { recursive: true });
  }
  const dateStr = new Date().toISOString().slice(0, 10);
  const reportPath = path.join(OUTPUTS_DIR, `pattern-analysis-${dateStr}.md`);

  const mdLines = [
    '# Application Pattern Analysis',
    `**Date:** ${dateStr}`,
    `**Grade:** ${overallGrade} ${emoji}`,
    `**Response Rate:** ${computedStats.responseRate}% (benchmark: 12%)`,
    '',
    '## Key Findings',
    '',
  ];
  (keyFindings || []).forEach(f => {
    mdLines.push(`### ${findingEmoji(f.severity)} ${f.finding}`);
    mdLines.push(`**Evidence:** ${f.evidence}`);
    mdLines.push('');
  });

  mdLines.push('## Top Issues to Fix', '');
  (topIssues || []).forEach((issue, i) => {
    mdLines.push(`### ${i + 1}. ${issue.issue}`);
    mdLines.push(`**Impact:** ${issue.impact}`);
    mdLines.push(`**Fix:** ${issue.fix}`);
    mdLines.push('');
  });

  mdLines.push('## What Is Working', '');
  (whatIsWorking || []).forEach(w => mdLines.push(`- ${w}`));
  mdLines.push('');

  mdLines.push('## Role Alignment', '', roleAlignmentAnalysis, '');

  mdLines.push('## Recommendations', '');
  mdLines.push('### Do Today');
  (recommendations?.immediate || []).forEach(r => mdLines.push(`- ${r}`));
  mdLines.push('');
  mdLines.push('### This Week');
  (recommendations?.thisWeek || []).forEach(r => mdLines.push(`- ${r}`));
  mdLines.push('');
  mdLines.push('### Strategic');
  (recommendations?.strategic || []).forEach(r => mdLines.push(`- ${r}`));
  mdLines.push('');

  mdLines.push(`## Predicted Response Rate If Fixed: ${predRate}`, '');
  mdLines.push(`> ${motivationalNote}`);

  fs.writeFileSync(reportPath, mdLines.join('\n'), 'utf8');
  console.log(`\nReport saved to outputs/pattern-analysis-${dateStr}.md`);
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
