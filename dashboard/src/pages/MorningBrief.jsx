import { useState } from 'react'

function ScoreDots({ score }) {
  if (score == null) return null
  const color = score >= 8 ? 'var(--green)' : score >= 6 ? 'var(--yellow)' : 'var(--red)'
  const filled = Math.round(score / 2)
  return (
    <span className="score-dots">
      {[1,2,3,4,5].map(i => (
        <span key={i} className="score-dot" style={{ background: i <= filled ? color : 'var(--border-hi)' }} />
      ))}
      <span style={{ color, fontSize: 12, fontWeight: 700, marginLeft: 4 }}>{score}</span>
    </span>
  )
}

function Attention({ brief, pendingApprovals, onNavigate }) {
  const items = []
  if (pendingApprovals > 0)
    items.push({ icon: '⏳', label: `${pendingApprovals} package${pendingApprovals !== 1 ? 's' : ''} ready for review`, page: 'approval', urgent: true })
  if ((brief?.followUpsDue || []).length > 0)
    items.push({ icon: '📅', label: `${brief.followUpsDue.length} follow-up${brief.followUpsDue.length !== 1 ? 's' : ''} due`, page: null })
  if ((brief?.newResponses || []).length > 0)
    items.push({ icon: '📬', label: `${brief.newResponses.length} new response${brief.newResponses.length !== 1 ? 's' : ''}`, page: null })
  if ((brief?.outreachDue || []).length > 0)
    items.push({ icon: '📨', label: `${brief.outreachDue.length} outreach follow-up${brief.outreachDue.length !== 1 ? 's' : ''} due`, page: 'outreach' })

  if (items.length === 0) return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--green)' }}>
        <span style={{ fontSize: 18 }}>✓</span>
        <span style={{ fontWeight: 600 }}>All caught up</span>
        <span style={{ color: 'var(--text-3)', fontWeight: 400, fontSize: 13 }}>Nothing needs attention right now.</span>
      </div>
    </div>
  )

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="section-label" style={{ marginBottom: 10 }}>Needs your attention</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item, i) => (
          <div
            key={i}
            onClick={() => item.page && onNavigate(item.page)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              cursor: item.page ? 'pointer' : 'default',
              padding: '8px 10px',
              borderRadius: 'var(--radius-sm)',
              background: item.urgent ? 'rgba(234,179,8,0.08)' : 'transparent',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => item.page && (e.currentTarget.style.background = 'var(--card-hover)')}
            onMouseLeave={e => item.page && (e.currentTarget.style.background = item.urgent ? 'rgba(234,179,8,0.08)' : 'transparent')}
          >
            <span style={{ fontSize: 16 }}>{item.icon}</span>
            <span style={{ flex: 1, fontSize: 13 }}>{item.label}</span>
            {item.page && <span style={{ color: 'var(--text-3)', fontSize: 12 }}>→</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

function Accordion({ title, count, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="accordion-header" onClick={() => setOpen(o => !o)}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>{title}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {count != null && (
            <span style={{ color: 'var(--text-3)', fontSize: 12 }}>{count}</span>
          )}
          <span style={{ color: 'var(--text-3)', fontSize: 16, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>›</span>
        </div>
      </div>
      {open && <div className="accordion-body">{children}</div>}
    </div>
  )
}

function ReviewCard({ item, onNavigate }) {
  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: 14,
        marginBottom: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
        <div>
          <span style={{ fontWeight: 600 }}>{item.company}</span>
          <span style={{ color: 'var(--text-3)', margin: '0 6px' }}>·</span>
          <span style={{ color: 'var(--text-2)' }}>{item.role}</span>
        </div>
        <ScoreDots score={item.fit_score} />
      </div>
      <div style={{ color: 'var(--text-3)', fontSize: 12, marginBottom: 10 }}>Tailored resume + cover letter ready</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-sm" onClick={() => onNavigate('approval')}>Review & Approve →</button>
        <button className="btn-ghost btn btn-sm" style={{ color: 'var(--text-2)' }}>Skip</button>
      </div>
    </div>
  )
}

function JobDiscoveryCard({ job }) {
  const color = job.fitScore >= 8 ? 'var(--green)' : job.fitScore >= 6 ? 'var(--yellow)' : 'var(--red)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px', borderBottom: '1px solid var(--border)' }}>
      <div style={{ width: 28, height: 28, background: 'var(--card-hover)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0, color: 'var(--text-2)' }}>
        {(job.company || '?').charAt(0)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 500, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.company}</div>
        <div style={{ color: 'var(--text-3)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.role}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <ScoreDots score={job.fitScore} />
      </div>
    </div>
  )
}

function FollowUpRow({ item }) {
  return (
    <div style={{ padding: '8px 4px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 500, fontSize: 13 }}>{item.company}</div>
        <div style={{ color: 'var(--text-3)', fontSize: 12 }}>{item.role}</div>
      </div>
      <div style={{ color: 'var(--yellow)', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>{item.daysSinceApplied}d</div>
    </div>
  )
}

function ResponseRow({ item }) {
  const cfg = {
    interview:  { color: 'var(--green)',  label: 'INTERVIEW' },
    rejected:   { color: 'var(--red)',    label: 'REJECTION' },
    offer:      { color: 'var(--purple)', label: 'OFFER' },
    responded:  { color: 'var(--blue)',   label: 'RESPONSE' },
  }
  const s = cfg[item.status] || cfg.responded
  return (
    <div style={{ padding: '8px 4px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 500, fontSize: 13 }}>{item.company}</div>
        <div style={{ color: 'var(--text-3)', fontSize: 12 }}>{item.role}</div>
      </div>
      <span className="status-badge" style={{ background: s.color + '22', color: s.color }}>{s.label}</span>
    </div>
  )
}

function OutreachRow({ item }) {
  const days = item.sent_at ? Math.floor((Date.now() - new Date(item.sent_at)) / 86400000) : null
  return (
    <div style={{ padding: '8px 4px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 500, fontSize: 13 }}>{item.company} · {item.contact_name || 'Hiring Team'}</div>
        <div style={{ color: 'var(--text-3)', fontSize: 12 }}>Sent {days}d ago · No reply</div>
      </div>
      <span style={{ color: 'var(--yellow)', fontSize: 11, fontWeight: 600 }}>FOLLOW UP</span>
    </div>
  )
}

function ApplyReadyRow({ item, onApplied }) {
  const [marking, setMarking] = useState(false)
  const mark = async () => {
    setMarking(true)
    try {
      await fetch(`/api/apply-queue/${item.id}/mark-applied`, { method: 'POST' })
      onApplied()
    } catch { /* silent */ }
    setMarking(false)
  }
  return (
    <div style={{ padding: '8px 4px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 500, fontSize: 13 }}>{item.company}</div>
        <div style={{ color: 'var(--text-3)', fontSize: 12 }}>{item.role} · {item.fit_score}/10</div>
      </div>
      <button className="btn btn-sm" onClick={mark} disabled={marking}>
        {marking ? '...' : 'Apply Now'}
      </button>
    </div>
  )
}

export default function MorningBrief({ brief, pendingApprovals, pendingQueue, onNavigate, onQuickApply, addToast, refreshBrief }) {
  const [quickUrl, setQuickUrl] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [applyQueue, setApplyQueue] = useState(null)

  const doRefresh = async () => {
    setRefreshing(true)
    await refreshBrief()
    setRefreshing(false)
  }

  const loadApplyQueue = () =>
    fetch('/api/apply-queue').then(r => r.json()).then(setApplyQueue).catch(() => {})

  const stats = brief?.stats || {}
  const responseRate = stats.responseRate ?? 0
  const rateColor = responseRate > 15 ? 'var(--green)' : responseRate >= 5 ? 'var(--yellow)' : 'var(--red)'
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  const profileName = 'Sai'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ flex: 1, overflow: 'auto', padding: '28px 28px 0' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 2 }}>Good morning, {profileName} ☀️</h1>
            <div style={{ color: 'var(--text-2)', fontSize: 13 }}>{today}</div>
          </div>
          <button
            onClick={doRefresh}
            disabled={refreshing}
            className="btn-ghost btn btn-sm"
          >
            {refreshing ? <span className="spinner" /> : '↻ Refresh'}
          </button>
        </div>

        {/* Stats bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
          {[
            { label: 'Applied',       value: stats.applied ?? 0,          color: 'var(--blue)' },
            { label: 'Responses',     value: stats.responded ?? 0,         color: 'var(--yellow)' },
            { label: 'Interviews',    value: stats.interviews ?? 0,        color: 'var(--green)' },
            { label: 'Response Rate', value: `${responseRate}%`,           color: rateColor },
          ].map(s => (
            <div key={s.label} className="card" style={{ textAlign: 'center', padding: '14px 12px' }}>
              <div style={{ color: s.color, fontSize: 26, fontWeight: 700, marginBottom: 2 }}>{s.value}</div>
              <div style={{ color: 'var(--text-3)', fontSize: 11 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Attention */}
        <Attention brief={brief} pendingApprovals={pendingApprovals} onNavigate={onNavigate} />

        {/* Review Packages */}
        <Accordion
          title={`Review Packages${pendingQueue?.length > 0 ? '' : ''}`}
          count={pendingQueue?.length > 0 ? `${pendingQueue.length} waiting` : 'none'}
          defaultOpen={true}
        >
          {!pendingQueue ? (
            <div style={{ color: 'var(--text-3)', padding: 12, fontSize: 13 }}>Loading...</div>
          ) : pendingQueue.length === 0 ? (
            <div className="empty-state" style={{ border: 'none', padding: '20px 12px' }}>
              <div className="empty-state-title">Nothing to review</div>
              <div className="empty-state-sub">Run discovery or score a job to build packages.</div>
            </div>
          ) : (
            pendingQueue.map(item => (
              <ReviewCard key={item.id} item={item} onNavigate={onNavigate} />
            ))
          )}
        </Accordion>

        {/* New Discoveries */}
        <Accordion
          title="New Discoveries"
          count={brief?.newJobs?.length > 0 ? `${brief.newJobs.length} today` : '0 today'}
          defaultOpen={false}
        >
          {(brief?.newJobs || []).length === 0 ? (
            <div className="empty-state" style={{ border: 'none', padding: '16px 12px' }}>
              <div className="empty-state-sub">No new jobs discovered today. Check Settings → Discovery.</div>
            </div>
          ) : (
            brief.newJobs.map(j => <JobDiscoveryCard key={j.id} job={j} />)
          )}
        </Accordion>

        {/* Follow-ups */}
        <Accordion
          title="Follow-ups Due"
          count={(brief?.followUpsDue || []).length > 0 ? brief.followUpsDue.length : null}
          defaultOpen={false}
        >
          {(brief?.followUpsDue || []).length === 0 ? (
            <div className="empty-state" style={{ border: 'none', padding: '16px 12px' }}>
              <div className="empty-state-sub">All caught up — no follow-ups needed.</div>
            </div>
          ) : (
            brief.followUpsDue.map(i => <FollowUpRow key={i.id} item={i} />)
          )}
        </Accordion>

        {/* Responses */}
        <Accordion
          title="Responses"
          count={(brief?.newResponses || []).length > 0 ? brief.newResponses.length : null}
          defaultOpen={false}
        >
          {(brief?.newResponses || []).length === 0 ? (
            <div className="empty-state" style={{ border: 'none', padding: '16px 12px' }}>
              <div className="empty-state-sub">No new responses recently.</div>
            </div>
          ) : (
            brief.newResponses.map(i => <ResponseRow key={i.id} item={i} />)
          )}
        </Accordion>

        {/* Outreach due */}
        {(brief?.outreachDue || []).length > 0 && (
          <Accordion title="Outreach Follow-up Due" count={brief.outreachDue.length} defaultOpen={false}>
            {brief.outreachDue.map(o => <OutreachRow key={o.id} item={o} />)}
          </Accordion>
        )}

        {/* Ready to apply */}
        <Accordion title="Ready to Apply" count={null} defaultOpen={false}>
          {applyQueue === null ? (
            <button className="btn btn-ghost btn-sm" onClick={loadApplyQueue} style={{ margin: 8 }}>Load queue</button>
          ) : applyQueue.length === 0 ? (
            <div className="empty-state" style={{ border: 'none', padding: '16px 12px' }}>
              <div className="empty-state-sub">Nothing approved yet. Review packages to add items.</div>
            </div>
          ) : (
            applyQueue.map(i => <ApplyReadyRow key={i.id} item={i} onApplied={() => {
              loadApplyQueue()
              addToast('Marked as applied!', 'success')
            }} />)
          )}
        </Accordion>

        <div style={{ height: 12 }} />
      </div>

      {/* Quick apply bar — always visible */}
      <div className="quick-apply-bar">
        <input
          className="form-input"
          placeholder="Paste a job URL to score it instantly..."
          value={quickUrl}
          onChange={e => setQuickUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && quickUrl.trim() && onQuickApply(quickUrl.trim())}
          style={{ flex: 1, margin: 0 }}
        />
        <button
          className="btn"
          onClick={() => quickUrl.trim() && onQuickApply(quickUrl.trim())}
          style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
        >
          Score →
        </button>
      </div>
    </div>
  )
}
