# Phase 14 — Smart Discovery Engine
## Goal
Discovery is fully profile-driven. No manual RSS configuration.
System auto-generates search queries from profile.targetRoles and location.
Pre-filters with Haiku before scoring. Pulls from 6+ sources automatically.
Profile must be approved before discovery runs.

---

## No New Dependencies

---

## Architecture

```
Profile.targetRoles + location + preferences
        ↓
Auto-generate search queries
        ↓
Fetch from 6 sources in parallel
        ↓
Pre-filter: Haiku YES/NO (5 tokens each)
        ↓
Score: Sonnet (700 tokens each)
        ↓
7.5+ → Auto-tailor → Approval queue
6-7.4 → Save as discovered, show in morning brief
<6 → Discard silently
```

---

## Files to Create

### 1. `discovery/query-builder.js`
Generate source URLs from profile. No hardcoded queries.

```javascript
function buildDiscoveryQueries(profile) {
  const roles = profile.targetRoles || []
  const location = encodeURIComponent(profile.location || 'Canada')
  const remote = profile.openToRemote
  const queries = []

  for (const role of roles.slice(0, 5)) {
    const q = encodeURIComponent(role)

    // Indeed
    queries.push({
      source: 'indeed',
      label: `Indeed: ${role}`,
      url: `https://www.indeed.com/rss?q=${q}&l=${location}&sort=date&fromage=1`,
      type: 'rss'
    })

    // Indeed remote (if open to remote)
    if (remote) {
      queries.push({
        source: 'indeed-remote',
        label: `Indeed Remote: ${role}`,
        url: `https://www.indeed.com/rss?q=${q}+remote&sort=date&fromage=1`,
        type: 'rss'
      })
    }
  }

  // Remote OK — map role categories
  const remoteOkCategories = mapRolesToRemoteOk(roles)
  for (const cat of remoteOkCategories) {
    queries.push({
      source: 'remoteok',
      label: `Remote OK: ${cat}`,
      url: `https://remoteok.com/remote-${cat}-jobs.rss`,
      type: 'rss'
    })
  }

  // We Work Remotely
  if (remote) {
    queries.push({
      source: 'weworkremotely',
      label: 'We Work Remotely: Management',
      url: 'https://weworkremotely.com/categories/remote-management-business-jobs.rss',
      type: 'rss'
    })
  }

  // Remotive API (JSON, not RSS)
  queries.push({
    source: 'remotive',
    label: 'Remotive: Management',
    url: 'https://remotive.com/api/remote-jobs?category=management&limit=20',
    type: 'json'
  })

  return queries
}

function mapRolesToRemoteOk(roles) {
  const roleStr = roles.join(' ').toLowerCase()
  const cats = []
  if (roleStr.includes('operations') || roleStr.includes('manager')) cats.push('operations')
  if (roleStr.includes('account') || roleStr.includes('tam') || roleStr.includes('customer')) cats.push('customer-success')
  if (roleStr.includes('product')) cats.push('product')
  if (roleStr.includes('engineer') || roleStr.includes('developer')) cats.push('dev')
  return cats.length ? cats : ['operations']
}

module.exports = { buildDiscoveryQueries }
```

---

### 2. `discovery/source-fetcher.js`
Fetch from multiple source types. Replace rss-scanner.js and extend it.

```javascript
const axios = require('axios')

// Parse RSS XML — same regex approach as existing rss-scanner.js
async function fetchRSS(url) {
  try {
    const response = await axios.get(url, { timeout: 10000, headers: { 'Accept': 'application/rss+xml, application/xml, text/xml' } })
    const items = []
    const itemRegex = /<item>([\s\S]*?)<\/item>/g
    let match
    while ((match = itemRegex.exec(response.data)) !== null) {
      const content = match[1]
      const title = extractXML(content, 'title')
      const link = extractXML(content, 'link')
      const pubDate = extractXML(content, 'pubDate')
      const description = extractXML(content, 'description')
      if (title && link) items.push({ title, url: link, pubDate, description })
    }
    return items
  } catch { return [] }
}

function extractXML(content, tag) {
  const match = content.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>`))
  return match ? (match[1] || match[2] || '').trim() : ''
}

// Fetch Remotive JSON API
async function fetchRemotive(url) {
  try {
    const response = await axios.get(url, { timeout: 10000 })
    const jobs = response.data.jobs || []
    return jobs.map(j => ({
      title: j.title,
      url: j.url,
      pubDate: j.publication_date,
      description: j.description ? j.description.replace(/<[^>]+>/g, '').slice(0, 300) : '',
      company: j.company_name
    }))
  } catch { return [] }
}

async function fetchFromSource(query) {
  if (query.type === 'json') return fetchRemotive(query.url)
  return fetchRSS(query.url)
}

module.exports = { fetchFromSource }
```

---

### 3. `discovery/pre-filter.js`
Haiku YES/NO check. Saves Sonnet scoring cost.

```javascript
const { callClaude } = require('../services/claude')

async function isRelevant(jobTitle, jobSnippet, profile) {
  const targetRoles = profile.targetRoles.join(', ')
  const coreSkills = profile.coreSkills.slice(0, 5).join(', ')

  const prompt = `Job: "${jobTitle}"
Snippet: "${(jobSnippet || '').slice(0, 150)}"
Candidate targets: ${targetRoles}
Candidate skills: ${coreSkills}
Is this job relevant to this candidate? Reply YES or NO only.`

  try {
    const result = await callClaude(prompt, {
      tier: 'cheap',
      maxTokens: 5,
      label: 'Pre-filter',
      useCache: false
    })
    return result.trim().toUpperCase().startsWith('YES')
  } catch {
    return true // on error, let it through
  }
}

module.exports = { isRelevant }
```

---

### 4. Rewrite `discovery/auto-scorer.js`
Replace existing file entirely.

```javascript
require('dotenv').config()
const { buildDiscoveryQueries } = require('./query-builder')
const { fetchFromSource } = require('./source-fetcher')
const { isRelevant } = require('./pre-filter')
const { fetchJobDescription } = require('../services/fetcher')
const { scoreJobFit } = require('../agents/fit-scorer')
const { tailorResume } = require('../agents/resume-tailor')
const { generateCoverLetter } = require('../agents/cover-letter')
const { scanATSGaps } = require('../agents/ats-scanner')
const { saveApplication, isDuplicate, addToApprovalQueue, initDB } = require('../services/db')
const { getProfileStatus } = require('../services/db')
const config = require('../core/config.json')

const fs = require('fs')
const path = require('path')

function loadProfile() {
  const profileName = process.env.ACTIVE_PROFILE || 'sai'
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'core', 'profiles', `${profileName}.json`), 'utf8'))
}

async function runDiscovery() {
  initDB()

  // Gate: profile must be approved
  const status = getProfileStatus()
  if (status.approved !== 'true') {
    console.log('⚠️  Profile not approved. Complete onboarding first.')
    return { discovered: 0, scored: 0, queued: 0 }
  }

  const profile = loadProfile()
  const queries = buildDiscoveryQueries(profile)
  const autoTailorThreshold = config.autoTailorThreshold || 7.5
  const minScoreToShow = config.minScoreToShow || 6.0

  let discovered = 0, scored = 0, queued = 0

  console.log(`🔍 Running discovery for: ${profile.targetRoles.slice(0,3).join(', ')}...`)
  console.log(`   Sources: ${queries.length} queries across ${new Set(queries.map(q=>q.source)).size} platforms`)

  // Fetch all sources in parallel
  const fetchResults = await Promise.allSettled(queries.map(q => fetchFromSource(q)))
  const allJobs = []

  fetchResults.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      allJobs.push(...result.value.map(job => ({ ...job, source: queries[i].source, label: queries[i].label })))
    }
  })

  // Deduplicate by URL
  const seen = new Set()
  const uniqueJobs = allJobs.filter(job => {
    if (!job.url || seen.has(job.url)) return false
    seen.add(job.url)
    return true
  })

  console.log(`   Found ${uniqueJobs.length} unique listings`)

  // Filter last 48 hours
  const cutoff = Date.now() - 48 * 60 * 60 * 1000
  const recentJobs = uniqueJobs.filter(job => {
    if (!job.pubDate) return true // include if no date
    const d = new Date(job.pubDate)
    return isNaN(d.getTime()) || d.getTime() > cutoff
  })

  // Process sequentially to avoid rate limits
  for (const job of recentJobs) {
    if (isDuplicate(job.url)) continue
    discovered++

    // Pre-filter with Haiku
    const relevant = await isRelevant(job.title, job.description, profile)
    if (!relevant) continue

    // Fetch full JD
    let jd = ''
    try {
      jd = await fetchJobDescription(job.url)
    } catch { continue }

    // Score with Sonnet
    let fitResult, atsResult
    try {
      ;[fitResult, atsResult] = await Promise.all([
        scoreJobFit(jd, job.title, job.company || ''),
        scanATSGaps(jd)
      ])
    } catch { continue }

    scored++

    if (fitResult.score < minScoreToShow) {
      await new Promise(r => setTimeout(r, 500))
      continue
    }

    // Save to applications
    const appId = 'J-' + Date.now()
    saveApplication({
      id: appId,
      job_url: job.url,
      company: job.company || fitResult.company || '',
      role: job.title,
      fit_score: fitResult.score,
      verdict: fitResult.verdict,
      apply_recommendation: fitResult.applyRecommendation ? 1 : 0,
      status: 'discovered',
      raw_score_json: JSON.stringify(fitResult)
    })

    console.log(`  [${fitResult.score}/10] ${job.title} — ${job.company || 'Unknown'} (${job.source})`)

    // Auto-tailor if above threshold
    if (fitResult.score >= autoTailorThreshold) {
      try {
        const [resume, coverLetter] = await Promise.all([
          tailorResume(jd, job.title, job.company || '', atsResult),
          generateCoverLetter(jd, job.title, job.company || '', fitResult.score)
        ])

        addToApprovalQueue({
          id: 'AQ-' + Date.now(),
          application_id: appId,
          company: job.company || '',
          role: job.title,
          job_url: job.url,
          fit_score: fitResult.score,
          verdict: fitResult.verdict,
          job_description: jd,
          tailored_resume: resume,
          cover_letter: coverLetter
        })

        queued++
        console.log(`  ✦ Queued for approval: ${job.title}`)
      } catch (err) {
        console.error(`  ✗ Tailor failed: ${err.message}`)
      }
    }

    await new Promise(r => setTimeout(r, 1000)) // rate limit
  }

  return { discovered, scored, queued }
}

module.exports = { runDiscovery }
```

---

### 5. Rewrite `scripts/discover.js`
Use new runDiscovery:

```javascript
require('dotenv').config()
const { runDiscovery } = require('../discovery/auto-scorer')

async function main() {
  console.log('\n🔍 Job AutoPilot — Discovery Run\n')
  const { discovered, scored, queued } = await runDiscovery()
  console.log(`\n📊 Results:`)
  console.log(`  Fetched:  ${discovered} new listings`)
  console.log(`  Scored:   ${scored} relevant listings`)
  console.log(`  Queued:   ${queued} packages ready for approval`)
  if (queued > 0) console.log(`\n  → Open dashboard to review`)
}

main().catch(console.error)
```

---

### 6. Update `core/config.json`
Add new fields:
```json
{
  "autoTailorThreshold": 7.5,
  "minScoreToShow": 6.0,
  "opportunityTypes": ["job", "contract", "remote"],
  "discoveryEnabled": true
}
```

---

## Done Test
```bash
# Test 1 — profile gate (if not approved)
node scripts/discover.js
# Expected: "Profile not approved. Complete onboarding first."

# Test 2 — with approved profile
# Approve profile via API first, then:
node scripts/discover.js
# Expected: prints sources, scoring results, queued items

# Test 3 — verify pre-filter saves calls
# Check PM2 logs — pre-filter rejections should outnumber scorings

# Test 4 — check approval queue
curl http://localhost:3001/api/approval-queue
# Expected: array of items with tailored_resume and cover_letter populated
```

Phase 14 complete when discover runs fully automated from profile with no manual RSS config.
