// ── Core fetch wrapper ──────────────────────────────────────────────────────
export async function api(path, options = {}) {
  const opts = { credentials: 'include', ...options }
  if (options.body && typeof options.body === 'string') {
    opts.headers = { 'Content-Type': 'application/json', ...options.headers }
  }
  const res = await fetch(path, opts)
  if (res.status === 401) { window.location.href = '/auth/google'; return null }
  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch { data = { error: text || 'Unknown error' } }
  if (!res.ok) throw new Error(data?.error || `Request failed: ${res.status}`)
  return data
}

// ── Date helpers ────────────────────────────────────────────────────────────
export function daysAgo(dateStr) {
  if (!dateStr) return null
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 86400000)
  if (diff === 0) return 'today'
  if (diff === 1) return 'yesterday'
  return `${diff}d ago`
}

export function daysAgoColor(dateStr) {
  if (!dateStr) return 'var(--text-3)'
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 86400000)
  if (diff >= 10) return 'var(--red)'
  if (diff >= 5)  return 'var(--yellow)'
  return 'var(--text-2)'
}

export function formatDate(d = new Date()) {
  return new Date(d).toLocaleDateString('en-CA', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  })
}

// ── Score helpers ───────────────────────────────────────────────────────────
export function scoreColor(score) {
  if (!score) return 'var(--text-3)'
  if (score >= 8) return 'var(--green)'
  if (score >= 6) return 'var(--yellow)'
  return 'var(--red)'
}

export function verdictLabel(score) {
  if (!score) return '—'
  if (score >= 8.5) return 'STRONG MATCH'
  if (score >= 7.5) return 'GOOD MATCH'
  if (score >= 6.5) return 'POSSIBLE'
  return 'STRETCH'
}

export function verdictClass(score) {
  if (!score) return 'badge-grey'
  if (score >= 8) return 'badge-green'
  if (score >= 6.5) return 'badge-yellow'
  return 'badge-red'
}

// ── Greeting helpers ────────────────────────────────────────────────────────
export function greetingTime() {
  const h = new Date().getHours()
  if (h < 12) return ['Good morning', '☀️']
  if (h < 17) return ['Good afternoon', '🌤']
  return ['Good evening', '🌙']
}

// ── Profile completeness ────────────────────────────────────────────────────
export function profileCompleteness(p) {
  if (!p) return 0
  let s = 0
  if (p.name)                        s += 15
  if (p.email)                       s += 10
  if (p.location)                    s += 10
  if (p.summary || p.about)          s += 10
  if (p.targetRoles?.length >= 2)    s += 10
  if (p.experience?.length >= 1)     s += 15
  if (p.coreSkills?.length >= 5)     s += 10
  if (p.education?.length >= 1)      s += 5
  if (p.certifications?.length >= 1) s += 5
  if (p.phone)                       s += 5
  if (p.linkedin)                    s += 5
  return Math.min(s, 100)
}

// ── Platform helpers ────────────────────────────────────────────────────────
export function isFreelancePlatform(source) {
  return ['upwork', 'fiverr', 'freelancer', 'peopleperhour'].includes(
    (source || '').toLowerCase()
  )
}

export function platformLabel(source) {
  const map = {
    upwork: 'Upwork', fiverr: 'Fiverr', freelancer: 'Freelancer.com',
    peopleperhour: 'PeoplePerHour', indeed: 'Indeed', linkedin: 'LinkedIn',
    remoteok: 'Remote OK', remotive: 'Remotive', monster: 'Monster',
    weworkremotely: 'We Work Remotely',
  }
  return map[(source || '').toLowerCase()] || source || 'Unknown'
}

// ── Clipboard helper ────────────────────────────────────────────────────────
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const el = document.createElement('textarea')
    el.value = text
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
    return true
  }
}
