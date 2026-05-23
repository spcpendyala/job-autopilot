const { callClaude } = require('../services/claude');

async function isRelevant(jobTitle, jobSnippet, profile) {
  const targetRoles = (profile.targetRoles || []).join(', ');
  const coreSkills = (profile.coreSkills || []).slice(0, 5).join(', ');

  const prompt = `Job: "${jobTitle}"
Snippet: "${(jobSnippet || '').slice(0, 150)}"
Candidate targets: ${targetRoles}
Candidate skills: ${coreSkills}
Is this job relevant to this candidate? Reply YES or NO only.`;

  try {
    const result = await callClaude(prompt, {
      tier: 'cheap',
      maxTokens: 5,
      useCache: false,
    });
    return result.trim().toUpperCase().startsWith('YES');
  } catch {
    return true;
  }
}

module.exports = { isRelevant };
