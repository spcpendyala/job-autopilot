import { useState, useEffect, useCallback } from 'react'
import { useUser } from '../UserContext'
import { api, daysAgo, daysAgoColor, greetingTime, formatDate, scoreColor, platformLabel, copyToClipboard } from '../lib/api'
import { useToast } from '../components/Toast'
import ScoreDots from '../components/ScoreDots'
import Spinner from '../components/Spinner'
import EmptyState from '../components/EmptyState'
import MarketIntel from '../components/MarketIntel'

// ── Collapsible section ───────────────────────────────────────────────────────
function Section({ title, count, defaultOpen = false, action, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ marginBottom: 8 }}>
      <div onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 20px', cursor: 'pointer', userSelect: 'none',
        borderBottom: open ? '1px solid var(--border)' : 'none',
      }}>
        <span style={{ fontSize: 12, color: 'var(--text-3)', width: 14 }}>{open ? '▼' : '▶'}</span>
        <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: 0.4, textTransform: 'uppercase', color: 'var(--text-2)', flex: 1 }}>
          {title}
        </span>
        {count > 0 && (
          <span style={{
            background: 'var(--border-hi)', color: 'var(--text-2)',
            borderRadius: 100, padding: '1px 8px', fontSize: 11, fontWeight: 700,
          }}>{count}</span>
        )}
        {action && <div onClick={e => e.stopPropagation()}>{action}</div>}
      </div>
      {open && <div style={{ padding: '8px 20px 16px' }}>{children}</div>}
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, color }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '16px 12px' }}>
      <div style={{ fontSize: 28, fontWeight: 800, color: color || 'var(--text)', lineHeight: 1, marginBottom: 6 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-3)' }}>
        {label}
      </div>
    </div>
  )
}

export default function Home({ navigate }) {
  const { user } = useUser()
  const { toast } = useToast()

  const [loading, setLoading]       = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats]           = useState({})
  const [queue, setQueue]           = useState([])
  const [discoveries, setDiscoveries] = useState([])
  const [followups, setFollowups]   = useState([])
  const [responses, setResponses]   = useState([])
  const [readyApply, setReadyApply] = useState([])
  const [profile, setProfile]       = useState(null)
  const [scoreUrl, setScoreUrl]     = useState('')
  const [discovering, setDiscovering] = useState(false)
  const [tailoring, setTailoring]   = useState({})

  const fetchAll = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try {
      const results = await Promise.allSettled([
        api('/api/stats'),
        api('/api/approval-queue'),
        api('/api/applications?status=discovered&limit=20'),
        api('/api/applications?status=applied&followupDue=true'),
        api('/api/applications?status=responded,interview,rejected'),
        api('/api/apply-queue'),
        api('/api/profile'),
      ])
      const [s, q, d, f, r, ra, p] = results.map(res =>
        res.status === 'fulfilled' ? (res.value || []) : []
      )
      setStats(s || {})
      setQueue(Array.isArray(q) ? q : [])
      setDiscoveries(Array.isArray(d) ? d : [])
      setFollowups(Array.isArray(f) ? f : [])
      setResponses(Array.isArray(r) ? r : [])
      setReadyApply(Array.isArray(ra) ? ra : [])
      if (p && !Array.isArray(p)) setProfile(p)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── Actions ──────────────────────────────────────────────────────────────────
  const skipApproval = async (id) => {
    setQueue(q => q.filter(i => i.id !== id))
    await api(`/api/approval-queue/${id}/skip`, { method: 'POST' }).catch(() => {})
    toast('Skipped')
  }

  const notInterested = async (app) => {
    setDiscoveries(d => d.filter(i => i.id !== app.id))
    await api('/api/preference/signal', {
      method: 'POST',
      body: JSON.stringify({ signal_type: 'deselected', applicationId: app.id, company: app.company, role: app.role }),
    }).catch(() => {})
    toast("Hidden — we won't show similar jobs")
  }

  const tailor = async (app) => {
    setTailoring(t => ({ ...t, [app.id]: true }))
    setDiscoveries(d => d.filter(i => i.id !== app.id))
    toast(`Tailoring started for ${app.company} — check Review Packages in ~30 seconds`)
    await api(`/api/applications/${app.id}/tailor`, { method: 'POST' }).catch(() => {})
    setTimeout(() => fetchAll(true), 35000)
    setTailoring(t => { const n = { ...t }; delete n[app.id]; return n })
  }

  const runDiscovery = async () => {
    setDiscovering(true)
    await api('/api/discover', { method: 'POST' }).catch(() => {})
    toast('Discovery started — check back in a minute')
    setTimeout(() => { fetchAll(true); setDiscovering(false) }, 5000)
  }

  const logAndClose = async (app) => {
    setResponses(r => r.filter(i => i.id !== app.id))
    await api(`/api/applications/${app.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'closed' }),
    }).catch(() => {})
    toast('Application closed')
  }

  const markApplied = async (item) => {
    if (!window.confirm(`Open ${item.company}'s job listing and mark as applied?`)) return
    if (item.job_url) window.open(item.job_url, '_blank')
    setReadyApply(r => r.filter(i => i.id !== item.id))
    await api(`/api/apply-queue/${item.id}/mark-applied`, { method: 'POST' }).catch(() => {})
    toast('Marked as applied ✓')
  }

  const copyFollowup = async (app) => {
    const text = `Subject: Following up — ${app.role} at ${app.company}\n\nHi [Hiring Manager's Name],\n\nI wanted to follow up on my application for the ${app.role} position at ${app.company}. I remain very interested in this opportunity and would love to connect.\n\nPlease let me know if you need anything else from me.\n\nBest regards,\n${user?.name || ''}`
    await copyToClipboard(text)
    toast('Copied! Paste into your email client.')
  }

  const pendingQueue = queue.filter(i => i.status === 'pending')

  // ── Loading ───────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Spinner size={28} />
      </div>
    )
  }

  // ── Global empty state ────────────────────────────────────────────────────────
  const allEmpty = pendingQueue.length === 0 && discoveries.length === 0 &&
    followups.length === 0 && responses.length === 0 && readyApply.length === 0 &&
    !stats.applied

  const [greeting, greetEmoji] = greetingTime()
  const firstName = user?.name?.split(' ')[0] || 'there'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* ── Header ── */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
              {greeting}, {firstName} {greetEmoji}
            </h1>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
              {formatDate()} · {user?.email}
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => fetchAll(true)} disabled={refreshing}>
            {refreshing ? <><Spinner size={12} /> Refreshing...</> : '⟳ Refresh'}
          </button>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, padding: '16px 20px' }}>
          <StatCard label="Applied"       value={stats.applied || 0}     color="var(--blue)" />
          <StatCard label="Responses"     value={stats.responded || 0}   color="var(--yellow)" />
          <StatCard label="Interviews"    value={stats.interviews || 0}  color="var(--green)" />
          <StatCard label="Response Rate" value={stats.responseRate || '0%'}
            color={(parseInt(stats.responseRate) || 0) >= 20 ? 'var(--green)' : 'var(--yellow)'} />
        </div>

        {/* Attention banner */}
        {pendingQueue.length > 0 && (
          <div style={{
            margin: '0 20px 8px', padding: '12px 16px',
            background: 'rgba(234,179,8,0.08)', borderLeft: '3px solid var(--yellow)',
            borderRadius: 'var(--radius-sm)', fontSize: 13,
          }}>
            ⚡ {pendingQueue.length} application package{pendingQueue.length > 1 ? 's' : ''} ready for your review
          </div>
        )}

        {/* Global empty */}
        {allEmpty && (
          <div style={{ padding: '40px 20px' }}>
            <EmptyState
              icon="🚀"
              title="Ready to find your next job"
              subtitle="We'll search job boards matching your profile every morning at 8am"
              action={discovering ? 'Searching...' : 'Find My First Jobs →'}
              onAction={runDiscovery}
              loading={discovering}
            />
          </div>
        )}

        {/* ── Section A: Review Packages ── */}
        <div className="card" style={{ margin: '0 20px 8px', padding: 0, overflow: 'hidden' }}>
          <Section title="Review Packages" count={pendingQueue.length} defaultOpen={true}>
            {pendingQueue.length === 0 ? (
              <div style={{ color: 'var(--text-3)', fontSize: 13, padding: '8px 0' }}>✓ Nothing to review right now</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pendingQueue.map(item => (
                  <div key={item.id} className="card" style={{ padding: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{item.company}</div>
                        <div style={{ color: 'var(--text-2)', fontSize: 13 }}>{item.role}</div>
                      </div>
                      <span className={`badge badge-grey`} style={{ fontSize: 10 }}>
                        {item.source || 'Job Board'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <ScoreDots score={item.fit_score} />
                      <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Resume + cover letter ready</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => skipApproval(item.id)}>Skip</button>
                      <button className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center' }}
                              onClick={() => navigate(`approval?${item.id}`)}>
                        Review & Approve →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>

        {/* ── Section B: New Discoveries ── */}
        <div className="card" style={{ margin: '0 20px 8px', padding: 0, overflow: 'hidden' }}>
          <Section title="New Discoveries" count={discoveries.length} defaultOpen={true}>
            {discoveries.length === 0 ? (
              <EmptyState
                icon="🔭"
                title="No new jobs yet"
                subtitle="Jobs appear here after each discovery run (daily at 8am)"
                action={discovering ? 'Searching...' : 'Run Discovery Now'}
                onAction={runDiscovery}
                loading={discovering}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {discoveries.map(app => (
                  <div key={app.id} className="card" style={{ padding: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{app.company}</div>
                        <div style={{ color: 'var(--text-2)', fontSize: 13 }}>{app.role}</div>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{daysAgo(app.created_at)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <ScoreDots score={app.fit_score} />
                      <span className="badge badge-grey" style={{ fontSize: 10 }}>
                        {platformLabel(app.source)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => notInterested(app)}>Not Interested</button>
                      <button className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center' }}
                              onClick={() => tailor(app)}>
                        Tailor & Review →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>

        {/* ── Section C: Follow-ups Due ── */}
        <div className="card" style={{ margin: '0 20px 8px', padding: 0, overflow: 'hidden' }}>
          <Section title="Follow-ups Due" count={followups.length} defaultOpen={false}>
            {followups.length === 0 ? (
              <div style={{ color: 'var(--text-3)', fontSize: 13, padding: '8px 0' }}>✓ No follow-ups needed today</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {followups.map(app => (
                  <div key={app.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 0', borderBottom: '1px solid var(--border)',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{app.company}</span>
                      <span style={{ color: 'var(--text-3)', fontSize: 12 }}> · {app.role}</span>
                    </div>
                    <span style={{ fontSize: 12, color: daysAgoColor(app.applied_at), flexShrink: 0 }}>
                      Applied {daysAgo(app.applied_at)}
                    </span>
                    <button className="btn btn-secondary btn-sm" onClick={() => copyFollowup(app)}>
                      Copy Follow-up Email
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>

        {/* ── Section D: Responses ── */}
        <div className="card" style={{ margin: '0 20px 8px', padding: 0, overflow: 'hidden' }}>
          <Section title="Responses" count={responses.length} defaultOpen={false}>
            {responses.length === 0 ? (
              <div style={{ color: 'var(--text-3)', fontSize: 13, padding: '8px 0' }}>📭 No responses yet — keep applying!</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {responses.map(app => {
                  const isInterview = app.status === 'interview'
                  const isRejected  = app.status === 'rejected'
                  return (
                    <div key={app.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: 12,
                      background: 'var(--surface)', borderRadius: 'var(--radius-sm)',
                      borderLeft: `3px solid ${isInterview ? 'var(--green)' : isRejected ? 'var(--red)' : 'var(--blue)'}`,
                      opacity: isRejected ? 0.65 : 1,
                    }}>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>
                        {isInterview ? '🎯' : isRejected ? '❌' : '📩'}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>
                          {app.company} — {isInterview ? 'interview scheduled' : isRejected ? 'not moving forward' : 'replied'}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{app.role}</div>
                      </div>
                      {isInterview && (
                        <button className="btn btn-primary btn-sm" onClick={() => navigate(`pipeline?app=${app.id}`)}>
                          View Interview Prep
                        </button>
                      )}
                      {isRejected && (
                        <button className="btn btn-ghost btn-sm" onClick={() => logAndClose(app)}>
                          Log & Close
                        </button>
                      )}
                      {!isInterview && !isRejected && (
                        <button className="btn btn-secondary btn-sm" onClick={() => navigate(`pipeline?app=${app.id}`)}>
                          View
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </Section>
        </div>

        {/* ── Section E: Ready to Apply ── */}
        <div className="card" style={{ margin: '0 20px 8px', padding: 0, overflow: 'hidden' }}>
          <Section title="Ready to Apply" count={readyApply.length} defaultOpen={false}>
            {readyApply.length === 0 ? (
              <div style={{ color: 'var(--text-3)', fontSize: 13, padding: '8px 0' }}>
                📋 Nothing approved yet — review packages above to add items here
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {readyApply.map(item => (
                  <div key={item.id} className="card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{item.company}</div>
                      <div style={{ color: 'var(--text-2)', fontSize: 13 }}>{item.role}</div>
                    </div>
                    <ScoreDots score={item.fit_score} showNumber={false} />
                    <button className="btn btn-primary btn-sm" onClick={() => markApplied(item)}>
                      Apply Now →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>

        {/* ── Market Intel ── */}
        {profile?.targetRoles && (
          <div style={{ padding: '0 20px 16px' }}>
            <MarketIntel targetRoles={profile.targetRoles} />
          </div>
        )}

      </div>

      {/* ── Sticky score bar ── */}
      <div className="sticky-score-bar" style={{
        position: 'sticky', bottom: 0, background: 'var(--surface)',
        borderTop: '1px solid var(--border)', padding: '10px 20px',
        display: 'flex', gap: 10, flexShrink: 0, zIndex: 10,
      }}>
        <input
          className="input"
          style={{ flex: 1, background: 'var(--card)' }}
          placeholder="Paste a job URL to score it instantly..."
          value={scoreUrl}
          onChange={e => setScoreUrl(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && scoreUrl.trim()) {
              navigate('find-job?url=' + encodeURIComponent(scoreUrl.trim()))
              setScoreUrl('')
            }
          }}
        />
        <button className="btn btn-primary" onClick={() => {
          if (scoreUrl.trim()) {
            navigate('find-job?url=' + encodeURIComponent(scoreUrl.trim()))
            setScoreUrl('')
          }
        }}>
          Score →
        </button>
      </div>
    </div>
  )
}
