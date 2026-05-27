'use strict';

module.exports = {
  fitScore: {
    score: 7.5,
    verdict: 'Strong fit',
    applyRecommendation: true,
    breakdown: [
      { category: 'Skills match', score: 8, notes: 'Node.js and React align well' },
      { category: 'Experience level', score: 7, notes: 'Meets seniority requirement' },
    ],
  },

  atsGaps: {
    gaps: ['TypeScript', 'AWS Lambda'],
    score: 78,
    recommendations: ['Add TypeScript to skills section', 'Highlight cloud experience'],
  },

  tailoredResume: `# Tailored Resume — Software Engineer at Acme Corp

## Professional Summary
Experienced software engineer with strong Node.js and React expertise.

## Experience
- Senior Engineer at Previous Co (2022–2025)

## Skills
Node.js, React, Express, SQLite`,

  coverLetter: `Dear Hiring Manager,

I am excited to apply for the Software Engineer position at Acme Corp.

Best regards,
Test User`,

  companyBrief: {
    summary: 'Acme Corp is a leading technology company.',
    culture: 'Collaborative and fast-moving',
    recentNews: [],
    glassdoorRating: 4.2,
  },

  outreachDraft: {
    subject: 'Interested in Software Engineer role at Acme Corp',
    body: 'Hi Jane,\n\nI came across the Software Engineer opening at Acme Corp...',
  },

  salaryBrief: {
    min: 90000,
    max: 130000,
    median: 110000,
    currency: 'USD',
    source: 'Market data',
  },
};
