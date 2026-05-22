import { useState } from 'react'

function StatPill({ label, value, color }) {
  return (
    <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 10, padding: '16px 20px', textAlign: 'center' }}>
      <div style={{ color: color || '#f0f0f0', fontSize: 28, fontWeight: 700, marginBottom: 4 }}>{value}</div>
      <div style={{ color: '#888', fontSize: 12 }}>{label}</div>
    </div>
  )
}

function ScoreBadge({ score }) {
  if (score == null) return null
  const color = score >= 8 ? '#22c55e' : score >= 6 ? '#eab308' : '#ef4444'
  return (
    <span style={{ background: color + '22', color, borderRadius: 4, fontSize: 11, fontWeight: 700, padding: '2px 8px' }}>{score}/10</span>
  )
}

function EmptyState({ icon, heading, sub }) {
  return (
    <div style={{ textAlign: 'center', padding: '36px 16px', border: '1px dashed #2a2a2a', borderRadius: 10 }}>
      <div style={{ fontSize: 32, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 14 }}>{heading}</div>
      <div style={{ color: '#555', fontSize: 13 }}>{sub}</div>
    </div>
  )
}

function Skeleton() {
  return (
    <div style={{ background: '#1a1a1a', borderRadius: 10, height: 80, marginBottom: 10, animation: 'pulse 1.5s ease-in-out infinite' }} />
  )
}

function JobCard({ job, addToast }) {
  const [expanded, setExpanded] = useState(false)
  const [generating, setGenerating] = useState(false)

  const generate = async () => {
    setGenerating(true)
    try {
      const r = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobUrl: job.jobUrl || undefined,
          jobTitle: job.role,
          company: job.company,
          fitScore: job.scoreDetails || { score: job.fitScore, verdict: job.verdict },
          atsGaps: null,
          generateDocs: true,
        }),
      })
      const d = await r.json()
      if (d.error) throw new Error(d.error)
      addToast('Package generated! Check Pipeline for details.', 'success')
    } catch (err) {
      addToast(err.message || 'Generation failed', 'error')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 10, padding: 16, marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        <div style={{ background: '#2a2a2a', borderRadius: 6, color: '#888', fontSize: 13, fontWeight: 700, height: 32, width: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {(job.company || '?').charAt(0)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{job.company || '—'}</div>
          <div style={{ color: '#888', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.role || '—'}</div>
        </div>
        <ScoreBadge score={job.fitScore} />
      </div>

      {expanded && job.scoreDetails?.oneLineSummary && (
        <div style={{ color: '#888', fontSize: 13, marginBottom: 10, paddingTop: 8, borderTop: '1px solid #2a2a2a' }}>
          {job.scoreDetails.oneLineSummary}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setExpanded(e => !e)} style={{ background: 'none', border: '1px solid #2a2a2a', borderRadius: 6, color: '#888', cursor: 'pointer', fontSize: 12, padding: '5px 10px' }}>
          {expanded ? 'Hide' : 'Score Details'}
        </button>
        <button onClick={generate} disabled={generating} style={{ background: '#22c55e', border: 'none', borderRadius: 6, color: '#000', cursor: generating ? 'default' : 'pointer', fontSize: 12, fontWeight: 600, opacity: generating ? 0.6 : 1, padding: '5px 12px' }}>
          {generating ? '...' : 'Generate Package →'}
        </button>
      </div>
    </div>
  )
}

function FollowUpCard({ item, addToast }) {
  const [expanded, setExpanded] = useState(false)
  const [marking, setMarking] = useState(false)
  const [copied, setCopied] = useState(false)

  const draft = `Subject: Following up — ${item.role} at ${item.company}

Hi,

I wanted to follow up on my application for the ${item.role} position at ${item.company}. I submitted ${item.daysSinceApplied} days ago and remain very interested in this opportunity.

Please let me know if you need any additional information or if there are next steps I should be aware of.

Thank you for your consideration.`

  const copy = () => {
    navigator.clipboard.writeText(draft).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  const markSent = async () => {
    setMarking(true)
    try {
      await fetch(`/api/applications/${item.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'applied', notes: 'Follow-up sent' }),
      })
      addToast('Marked as sent!', 'success')
    } catch {
      addToast('Could not update.', 'error')
    } finally {
      setMarking(false)
    }
  }

  return (
    <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 10, padding: 16, marginBottom: 10 }}>
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{item.company}</div>
      <div style={{ color: '#888', fontSize: 12, marginBottom: 10 }}>{item.role} · {item.daysSinceApplied}d since applied</div>
      {expanded && (
        <pre style={{ background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 6, color: '#d0d0d0', fontFamily: 'SF Mono, Fira Code, monospace', fontSize: 12, lineHeight: 1.6, marginBottom: 10, padding: 12, whiteSpace: 'pre-wrap' }}>
          {draft}
        </pre>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={() => setExpanded(e => !e)} style={{ background: 'none', border: '1px solid #2a2a2a', borderRadius: 6, color: '#888', cursor: 'pointer', fontSize: 12, padding: '5px 10px' }}>
          {expanded ? 'Hide Draft' : 'View Draft'}
        </button>
        {expanded && (
          <>
            <button onClick={copy} style={{ background: 'none', border: '1px solid #2a2a2a', borderRadius: 6, color: copied ? '#22c55e' : '#888', cursor: 'pointer', fontSize: 12, padding: '5px 10px' }}>
              {copied ? '✓ Copied' : 'Copy Email'}
            </button>
            <button onClick={markSent} disabled={marking} style={{ background: 'none', border: '1px solid #2a2a2a', borderRadius: 6, color: '#888', cursor: 'pointer', fontSize: 12, padding: '5px 10px' }}>
              Mark as Sent
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function ResponseCard({ item }) {
  const cfg = {
    interview: { bg: '#14332a', border: '#22c55e', color: '#22c55e', label: 'INTERVIEW REQUEST', icon: '🎉' },
    rejected:  { bg: '#3d1515', border: '#ef4444', color: '#ef4444', label: 'REJECTION',         icon: '😔' },
    responded: { bg: '#0d1f3c', border: '#3b82f6', color: '#3b82f6', label: 'RESPONSE',          icon: '📬' },
    offer:     { bg: '#2d1a5e', border: '#a855f7', color: '#a855f7', label: 'OFFER',             icon: '🎊' },
  }
  const s = cfg[item.status] || cfg.responded
  return (
    <div style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 10, padding: 16, marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span>{s.icon}</span>
        <span style={{ color: s.color, fontSize: 11, fontWeight: 700 }}>{s.label}</span>
      </div>
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{item.company}</div>
      <div style={{ color: '#888', fontSize: 12 }}>{item.role}</div>
    </div>
  )
}

export default function MorningBrief({ brief, onQuickApply, addToast, refreshBrief }) {
  const [quickUrl, setQuickUrl] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const doRefresh = async () => {
    setRefreshing(true)
    await refreshBrief()
    setRefreshing(false)
  }

  const stats = brief?.stats || {}
  const responseRate = stats.responseRate ?? 0
  const rateColor = responseRate > 15 ? '#22c55e' : responseRate >= 5 ? '#eab308' : '#ef4444'

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div style={{ padding: 32, maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Good morning, Sai ☀️</h1>
          <div style={{ color: '#888' }}>{today}</div>
        </div>
        <button
          onClick={doRefresh}
          disabled={refreshing}
          style={{ background: 'none', border: '1px solid #2a2a2a', borderRadius: 8, color: '#888', cursor: 'pointer', fontSize: 12, padding: '8px 14px' }}
        >
          {refreshing ? '...' : '↻ Refresh'}
        </button>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 32 }}>
        <StatPill label="Applied" value={stats.applied ?? 0} color="#3b82f6" />
        <StatPill label="Responses" value={stats.responded ?? 0} color="#eab308" />
        <StatPill label="Interviews" value={stats.interviews ?? 0} color="#22c55e" />
        <StatPill label="Response Rate" value={`${responseRate}%`} color={rateColor} />
      </div>

      {/* Three columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 32 }}>
        <div>
          <div style={{ color: '#888', fontSize: 11, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 14 }}>🔍 New Jobs</div>
          {!brief
            ? <><Skeleton /><Skeleton /></>
            : brief.newJobs?.length > 0
              ? brief.newJobs.map(j => <JobCard key={j.id} job={j} addToast={addToast} />)
              : <EmptyState icon="🔭" heading="No new jobs today" sub="Add companies to watch in Settings → Discovery." />
          }
        </div>

        <div>
          <div style={{ color: '#888', fontSize: 11, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 14 }}>📅 Follow-ups Due</div>
          {!brief
            ? <><Skeleton /></>
            : brief.followUpsDue?.length > 0
              ? brief.followUpsDue.map(i => <FollowUpCard key={i.id} item={i} addToast={addToast} />)
              : <EmptyState icon="🎉" heading="You're all caught up!" sub="No follow-ups needed right now." />
          }
        </div>

        <div>
          <div style={{ color: '#888', fontSize: 11, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 14 }}>📬 Responses</div>
          {!brief
            ? <><Skeleton /></>
            : brief.newResponses?.length > 0
              ? brief.newResponses.map(i => <ResponseCard key={i.id} item={i} />)
              : <EmptyState icon="📭" heading="No new responses today" sub="Keep applying — it's a numbers game!" />
          }
        </div>
      </div>

      {/* Quick Apply */}
      <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: 24 }}>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>🔍 Found a job? Score it instantly</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            className="form-input"
            placeholder="Paste job URL here..."
            value={quickUrl}
            onChange={e => setQuickUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && quickUrl.trim() && onQuickApply(quickUrl.trim())}
            style={{ flex: 1 }}
          />
          <button
            className="btn"
            onClick={() => quickUrl.trim() && onQuickApply(quickUrl.trim())}
            style={{ whiteSpace: 'nowrap' }}
          >
            Score →
          </button>
        </div>
      </div>

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.5 } }`}</style>
    </div>
  )
}
