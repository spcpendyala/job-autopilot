#!/usr/bin/env node
'use strict';

// Manual checklist runner — no external dependencies beyond readline + fs.
// Usage: node tests/manual-checklist/run-checklist.js
//   or:  npm run test:manual

const readline = require('readline');
const fs = require('fs');
const path = require('path');

// ── Scenarios ─────────────────────────────────────────────────────────────────

const SCENARIOS = [
  // Group J — Freelance (7)
  {
    id: 'J1',
    group: 'Freelance',
    title: 'Freelance page loads with platform tabs',
    steps: 'Navigate to Freelance. Confirm tabs for Upwork / Fiverr / Freelancer are visible.',
  },
  {
    id: 'J2',
    group: 'Freelance',
    title: 'Gig list renders or shows empty state',
    steps: 'Select each platform tab. Confirm gig cards appear, or an empty-state message — no crash or spinner stuck.',
  },
  {
    id: 'J3',
    group: 'Freelance',
    title: '"Write Proposal" generates AI text',
    steps: 'Open any gig. Click "Write Proposal". Confirm AI text appears within ~30s — not blank, not an error.',
  },
  {
    id: 'J4',
    group: 'Freelance',
    title: 'Generated proposal auto-saves as draft',
    steps: 'After J3, navigate away then return to the gig. Confirm the proposal is still shown with status "draft".',
  },
  {
    id: 'J5',
    group: 'Freelance',
    title: '"Mark Sent" transitions proposal status',
    steps: 'Click "Mark Sent" on a draft proposal. Confirm status changes to "Pending / Sent".',
  },
  {
    id: 'J6',
    group: 'Freelance',
    title: 'Status dropdown updates correctly',
    steps: 'Use the status dropdown on a proposal (Won / Lost / Cancelled). Confirm the UI reflects the new status after selection.',
  },
  {
    id: 'J7',
    group: 'Freelance',
    title: 'Disabled platforms show correct indicator',
    steps: 'Check platforms not yet integrated (e.g. Freelancer, Fiverr). Confirm "Coming Soon" or disabled state — no broken UI.',
  },

  // Group K — Outreach (4)
  {
    id: 'K1',
    group: 'Outreach',
    title: 'Recruiter Finder returns a result',
    steps: 'Open any application. Click "Find Recruiter". Enter a real company name. Confirm a name/email or LinkedIn hint appears within ~30s.',
  },
  {
    id: 'K2',
    group: 'Outreach',
    title: 'Cold outreach draft personalises company & role',
    steps: 'Click "Draft Outreach" on an application. Confirm the generated message explicitly names the company and the target role — not a generic template.',
  },
  {
    id: 'K3',
    group: 'Outreach',
    title: '"Mark Sent" updates outreach status',
    steps: 'In the Outreach list, click "Mark Sent" on a draft. Confirm the item moves to "Sent" state and the sent-at timestamp is recorded.',
  },
  {
    id: 'K4',
    group: 'Outreach',
    title: 'Follow-up prompt suppressed after recruiter replies',
    steps: 'On an outreach record, click "Mark Replied". Confirm no follow-up reminder is shown for that item.',
  },

  // Group N — Notifications (4)
  {
    id: 'N1',
    group: 'Notifications',
    title: 'Notification bell shows correct unread count',
    steps: 'Check the bell icon in the sidebar header. If there are unread notifications the badge count must match the actual number of unread items.',
  },
  {
    id: 'N2',
    group: 'Notifications',
    title: '"Mark all read" zeroes the badge',
    steps: 'Open the notifications panel. Click "Mark all read". Confirm the badge disappears and all items show as read.',
  },
  {
    id: 'N3',
    group: 'Notifications',
    title: 'Market Intelligence card loads data',
    steps: 'Navigate to Home. Confirm the Market Intelligence section shows trending skills or salary data — not stuck loading.',
  },
  {
    id: 'N4',
    group: 'Notifications',
    title: 'Skills Gap section populates after discovery',
    steps: 'In Settings, trigger a discovery run. Navigate to Pipeline. Confirm the Skills Gap section lists at least one keyword from recent job postings.',
  },

  // Group O — Mobile (6)
  {
    id: 'O1',
    group: 'Mobile',
    title: 'Mobile nav appears at narrow viewport',
    steps: 'Resize browser to ≤ 768px wide (or use DevTools device mode). Confirm bottom-tab or hamburger nav appears — desktop sidebar should hide.',
  },
  {
    id: 'O2',
    group: 'Mobile',
    title: 'Application cards readable at 375px',
    steps: 'At 375px viewport width, open Pipeline. Confirm each card fits the screen without horizontal overflow or truncated buttons.',
  },
  {
    id: 'O3',
    group: 'Mobile',
    title: 'Kanban scrolls horizontally on mobile',
    steps: 'At 375px, confirm the kanban board can be scrolled left/right. No column should be completely hidden with no way to reach it.',
  },
  {
    id: 'O4',
    group: 'Mobile',
    title: 'Find-a-Job textarea usable with mobile keyboard',
    steps: 'On a real device or iOS/Android emulator, tap the textarea in Find a Job. Confirm the keyboard does not obscure the "Analyze Job" button (or page scrolls to reveal it).',
  },
  {
    id: 'O5',
    group: 'Mobile',
    title: 'Approval screen panels stack on mobile',
    steps: 'Open an approval item on a ≤ 768px viewport. Confirm the left (job details) and right (resume/cover letter) panels stack vertically — not side by side (too cramped).',
  },
  {
    id: 'O6',
    group: 'Mobile',
    title: 'Settings toggles are touch-friendly',
    steps: 'On a ≤ 768px viewport, open Settings. Confirm each toggle/switch has a tap target of at least 44×44px — no mis-taps needed.',
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(q) {
  return new Promise(resolve => rl.question(q, resolve));
}

function hr(char = '─', len = 60) {
  return char.repeat(len);
}

function pad(s, w) {
  return String(s).padEnd(w);
}

// ── Main runner ───────────────────────────────────────────────────────────────

async function main() {
  console.log('\n' + hr('═'));
  console.log('  Job AutoPilot — Manual QA Checklist');
  console.log(hr('═'));
  console.log(`  ${SCENARIOS.length} scenarios across 4 groups: J Freelance · K Outreach · N Notifications · O Mobile`);
  console.log('  For each scenario enter:  P = Pass   F = Fail   S = Skip');
  console.log(hr('─') + '\n');

  const results = [];
  let currentGroup = null;

  for (const scenario of SCENARIOS) {
    if (scenario.group !== currentGroup) {
      currentGroup = scenario.group;
      console.log('\n' + hr('─'));
      console.log(`  GROUP: ${currentGroup.toUpperCase()}`);
      console.log(hr('─'));
    }

    console.log(`\n[${scenario.id}] ${scenario.title}`);
    console.log(`  Steps: ${scenario.steps}`);

    let answer = '';
    while (!['p', 'f', 's'].includes(answer.toLowerCase())) {
      answer = (await ask('  Result [P/F/S]: ')).trim();
      if (!['p', 'f', 's'].includes(answer.toLowerCase())) {
        console.log('  ⚠  Enter P, F, or S.');
      }
    }

    const status = answer.toLowerCase() === 'p' ? 'pass'
      : answer.toLowerCase() === 'f' ? 'fail'
      : 'skip';

    let notes = '';
    if (status === 'fail') {
      notes = (await ask('  Failure notes (describe what went wrong): ')).trim();
    }

    results.push({ id: scenario.id, group: scenario.group, title: scenario.title, status, notes });
    console.log(`  → ${status === 'pass' ? '✓ PASS' : status === 'fail' ? '✗ FAIL' : '– SKIP'}`);
  }

  rl.close();

  // ── Save results ─────────────────────────────────────────────────────────────
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outDir = path.join(__dirname);
  const outFile = path.join(outDir, `results-${timestamp}.json`);

  const output = {
    runAt: new Date().toISOString(),
    total: results.length,
    passed: results.filter(r => r.status === 'pass').length,
    failed: results.filter(r => r.status === 'fail').length,
    skipped: results.filter(r => r.status === 'skip').length,
    results,
  };

  fs.writeFileSync(outFile, JSON.stringify(output, null, 2));

  // ── Print summary ─────────────────────────────────────────────────────────────
  console.log('\n' + hr('═'));
  console.log('  RESULTS SUMMARY');
  console.log(hr('═'));
  console.log(`  Total:   ${output.total}`);
  console.log(`  ✓ Passed:  ${output.passed}`);
  console.log(`  ✗ Failed:  ${output.failed}`);
  console.log(`  – Skipped: ${output.skipped}`);

  if (output.failed > 0) {
    console.log('\n' + hr('─'));
    console.log('  FAILURES');
    console.log(hr('─'));
    results
      .filter(r => r.status === 'fail')
      .forEach(r => {
        console.log(`\n  [${r.id}] ${r.title}`);
        if (r.notes) console.log(`         ${r.notes}`);
      });
  }

  console.log('\n' + hr('─'));
  console.log(`  Results saved to: ${outFile}`);
  console.log(hr('═') + '\n');

  process.exit(output.failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Checklist runner error:', err.message);
  process.exit(1);
});
