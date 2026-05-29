'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// AI Quality Tests — uses the REAL Anthropic API (TEST_MODE=false).
// Run only on the nightly CI cron or locally with ANTHROPIC_API_KEY set.
//
// Cost estimate: ~$0.02–0.08 per full run (Haiku for scoring + agent calls).
// DO NOT run during regular development — use `npm test` for fast feedback.
// ─────────────────────────────────────────────────────────────────────────────

const path = require('path');
const fs = require('fs');

if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'test' || process.env.ANTHROPIC_API_KEY === 'test-placeholder-key') {
  describe.skip('AI Quality — skipped (no real API key)', () => {});
} else {

const judge = require('./judge');

// ── Test fixtures ────────────────────────────────────────────────────────────

const NODE_AWS_JD = `
Senior Backend Engineer — Distributed Systems
Company: CloudScale Technologies | Remote

We are looking for a senior backend engineer to join our platform team.

Requirements:
- 5+ years professional software engineering experience
- Strong proficiency in Node.js (TypeScript preferred)
- Hands-on experience with AWS (EC2, Lambda, S3, RDS, ECS, SQS)
- Experience designing and operating distributed systems at scale
- Solid understanding of PostgreSQL and query optimisation
- Experience with Docker; Kubernetes a plus
- Track record of mentoring engineers and leading technical design reviews

Responsibilities:
- Design and build highly scalable APIs serving 10M+ requests/day
- Own reliability, observability, and performance of core services
- Lead technical design reviews; collaborate closely with product & design
- Document architectural decisions and best practices
`;

const MARKETING_JD = `
Marketing Manager — Brand Strategy & Campaigns
Company: Lifestyle Brands Co. | New York, NY

We're hiring an experienced Marketing Manager to lead our integrated campaigns.

Requirements:
- 5+ years of marketing experience with a brand/campaigns focus
- Deep knowledge of consumer psychology and market research methods
- Hands-on experience managing $1M+ marketing budgets
- Proficiency in Adobe Creative Suite and Figma
- Experience running influencer marketing and social campaigns
- MBA strongly preferred

Responsibilities:
- Develop and execute multi-channel brand campaigns
- Manage relationships with advertising agencies and creative partners
- Analyse market trends and synthesise customer insight into strategy
- Oversee content calendar across all owned and paid channels
`;

const TEST_USER_ID = 'ai-quality-test';

const TEST_PROFILE = {
  name: 'Alex Johnson',
  email: 'alex@test.com',
  location: 'San Francisco, CA',
  summary: 'Senior software engineer with 7 years building scalable backend systems ' +
    'in Node.js and Python on AWS. Led teams of 4–8 engineers. Deep background in ' +
    'distributed systems, REST API design, and data-intensive services.',
  coreSkills: [
    'Node.js', 'TypeScript', 'Python', 'AWS', 'Docker',
    'PostgreSQL', 'React', 'REST APIs', 'Microservices', 'CI/CD',
  ],
  targetRoles: ['Senior Software Engineer', 'Staff Engineer', 'Backend Engineer'],
  experience: [
    {
      title: 'Senior Software Engineer',
      company: 'TechCorp Inc.',
      from: '2021',
      to: 'present',
      description: 'Led backend architecture for payment processing system handling $50M/month.',
      highlights: [
        'Reduced API latency by 40% through query optimisation and caching',
        'Led migration from monolith to microservices, cutting deploy time from 45 min to 4 min',
      ],
      skillsUsed: ['Node.js', 'TypeScript', 'PostgreSQL', 'AWS', 'Docker'],
    },
    {
      title: 'Software Engineer',
      company: 'StartupXYZ',
      from: '2018',
      to: '2021',
      description: 'Built the data ingestion pipeline processing 500k events/day.',
      highlights: [
        'Designed event-driven architecture with SQS and Lambda',
        'Mentored 3 junior engineers; all promoted within 18 months',
      ],
      skillsUsed: ['Python', 'AWS Lambda', 'SQS', 'PostgreSQL'],
    },
  ],
  education: [
    { degree: 'B.S. Computer Science', institution: 'UC Berkeley', year: '2018' },
  ],
  achievements: [
    'Reduced production incidents by 60% after implementing comprehensive alerting and runbooks',
    'Presented distributed-tracing architecture at NodeConf 2023 (350 attendees)',
  ],
};

// ── Setup/teardown ────────────────────────────────────────────────────────────

beforeAll(() => {
  // Write legacy sai.json profile so legacy agent fallbacks don't crash
  const profilesDir = path.join(__dirname, '..', '..', 'core', 'profiles');
  fs.mkdirSync(profilesDir, { recursive: true });
  fs.writeFileSync(path.join(profilesDir, 'sai.json'), JSON.stringify({
    name: 'Test User', email: 'test@example.com',
    targetRoles: ['Operations Manager', 'TAM'],
    coreSkills: ['Operations', 'Leadership', 'Process Improvement', 'Strategy'],
    experience: [{ title: 'Senior Manager', company: 'Acme Corp',
      from: '2018', to: '2024', description: 'Led ops team of 10',
      highlights: ['Reduced costs 30%', 'Built $50M pipeline'] }],
    yearsExperience: 7, location: 'Toronto, ON', openToRemote: true,
    summary: 'Operations leader with 7 years experience',
  }, null, 2));

  const baseResumePath = path.join(__dirname, '..', '..', 'core', 'base-resume.md');
  if (!fs.existsSync(baseResumePath)) {
    fs.writeFileSync(baseResumePath, '# Test User\n\nOperations leader with 7 years experience.\n');
  }

  // Write a test user profile so cover-letter and other agents have context
  const usersDir = path.join(__dirname, '..', '..', 'data', 'users', TEST_USER_ID);
  fs.mkdirSync(path.join(usersDir, 'outputs'), { recursive: true });
  fs.mkdirSync(path.join(usersDir, 'resumes'), { recursive: true });
  fs.writeFileSync(
    path.join(usersDir, 'profile.json'),
    JSON.stringify(TEST_PROFILE, null, 2)
  );

  // Init the test DB (needed because agents import db.js at module level)
  process.env.TEST_DB_PATH = process.env.TEST_DB_PATH ||
    path.join(__dirname, '..', '..', 'data', 'ai-quality.db');
  const { initDB } = require('../../services/db');
  initDB();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AI Quality — Real Claude API', () => {

  // P1 ── Score discriminates strong vs weak match
  test('P1: fit-scorer gives strong score ≥7 and weak score ≤4, delta ≥3', async () => {
    const { scoreJobFit } = require('../../agents/fit-scorer');

    const [strong, weak] = await Promise.all([
      scoreJobFit(NODE_AWS_JD, 'Senior Backend Engineer', 'CloudScale Technologies'),
      scoreJobFit(MARKETING_JD, 'Marketing Manager', 'Lifestyle Brands Co.'),
    ]);

    // scoreJobFit may return an object { score, verdict, ... } or a raw number
    const strongScore = (typeof strong === 'object' && strong !== null) ? strong.score : strong;
    const weakScore   = (typeof weak   === 'object' && weak   !== null) ? weak.score   : weak;

    console.log(`[P1] Strong (Node/AWS): ${strongScore} | Weak (Marketing): ${weakScore}`);

    expect(strongScore).toBeGreaterThanOrEqual(7);
    expect(weakScore).toBeLessThanOrEqual(4);
    expect(strongScore - weakScore).toBeGreaterThanOrEqual(3);
  }, 60000);

  // P3 ── Cover letter passes quality rubric
  test('P3: cover letter passes no-cliché, names company, <300 words, has achievement', async () => {
    const { generateCoverLetter } = require('../../agents/cover-letter');

    const coverLetter = await generateCoverLetter(
      NODE_AWS_JD,
      'Senior Backend Engineer',
      'CloudScale Technologies',
      7.5,
      TEST_USER_ID
    );

    console.log('[P3] Cover letter length:', coverLetter.length, 'chars');
    expect(typeof coverLetter).toBe('string');
    expect(coverLetter.length).toBeGreaterThan(100);

    const rubric = [
      'no_cliche_opener: does NOT start with "I am excited", "I am thrilled", or "I am pleased"',
      'names_company: explicitly mentions CloudScale Technologies',
      'under_300_words: the full letter body contains fewer than 300 words',
      'specific_achievement: references at least one concrete metric or quantified result from the applicant',
    ];

    const result = await judge.evaluate('Cover letter quality', coverLetter, rubric);
    console.log('[P3] Judge result:', JSON.stringify(result));

    expect(result.overall).toBeGreaterThanOrEqual(3.5);
  }, 90000);

  // P5 ── Interview prep has STAR answers
  test('P5: interview prep contains 5+ questions and STAR-format answers', async () => {
    const { generateInterviewBrief } = require('../../agents/interview-prep');

    const brief = await generateInterviewBrief(
      NODE_AWS_JD,
      'CloudScale Technologies',
      'Senior Backend Engineer',
      null   // no company brief
    );

    console.log('[P5] Interview brief length:', brief.length, 'chars');
    expect(typeof brief).toBe('string');
    expect(brief.length).toBeGreaterThan(200);

    const rubric = [
      'five_or_more_questions: the brief contains at least 5 distinct interview questions',
      'star_format: at least one answer section follows a Situation → Task → Action → Result structure',
      'role_specific: questions reference distributed systems, Node.js, or AWS as mentioned in the JD',
    ];

    const result = await judge.evaluate('Interview prep quality', brief, rubric);
    console.log('[P5] Judge result:', JSON.stringify(result));

    expect(result.overall).toBeGreaterThanOrEqual(3.5);
  }, 90000);

  // P9 ── Outreach draft is concise and personalized
  test('P9: outreach draft is <150 words, names recruiter, ends with CTA', async () => {
    const { draftOutreach } = require('../../agents/outreach-drafter');

    const draft = await draftOutreach(
      'CloudScale Technologies',
      'Senior Backend Engineer',
      { name: 'Jane Smith', title: 'Engineering Manager', email: 'jane@cloudscale.io', linkedin: '' },
      NODE_AWS_JD
    );

    // draftOutreach may return { subject, body } or a raw string
    const body = (draft && typeof draft === 'object' && draft.body) ? draft.body : String(draft);

    console.log('[P9] Outreach body length:', body.length, 'chars');
    expect(body.length).toBeGreaterThan(30);

    const rubric = [
      'under_150_words: the message body contains fewer than 150 words',
      'names_recruiter: directly addresses Jane or Jane Smith by name',
      'specific_cta: ends with a clear call-to-action (e.g. request a call, meeting, or brief chat)',
    ];

    const result = await judge.evaluate('Recruiter outreach quality', body, rubric);
    console.log('[P9] Judge result:', JSON.stringify(result));

    expect(result.overall).toBeGreaterThanOrEqual(3.5);
  }, 60000);

});

} // end else (real API key guard)
