import { useState, useEffect } from 'react'
import ApplicationDetail from '../components/ApplicationDetail'

function ScoreDots({ score }) {
  if (score == null) return null
  const color = score >= 8 ? 'var(--green)' : score >= 6 ? 'var(--yellow)' : 'var(--red)'
  const filled = Math.round(score / 2)
  return (
    <span className="score-dots">
      {[1,2,3,4,5].map(i => (
        <span key={i} className="score-dot" style={{ background: i <= filled ? color : 'var(--border-hi)' }} />
      ))}
      <span style={{ color, fontSize: 11, fontWeight: 700, marginLeft: 4 }}>{score}</span>
    </span>
  )
}

function daysSince(dateStr) {
  if (!dateStr) return null
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

const COLUMNS = [
  { id: 'discovered', label: 'DISCOVERED', color: 'var(--text-2)',  statuses: ['discovered'] },
  { id: 'approved',   label: 'APPROVED',   color: 'var(--yellow)',  statuses: ['approved'] },
  { id: 'applied',    label: 'APPLIED',    color: 'var(--blue)',    statuses: ['applied'] },
  { id: 'responded',  label: 'RESPONDED',  color: 'var(--yellow)',  statuses: ['responded', 'interview-prep-ready'] },
  { id: 'interview',  label: 'INTERVIEW',  color: 'var(--green)',   statuses: ['interview'] },
  { id: 'offer',      label: 'OFFER',      color: 'var(--purple)',  statuses: ['offer'] },
  { id: 'rejected',   label: 'REJECTED',   color: 'var(--red)',     statuses: ['rejected'] },
]

function KanbanCard({ app, applyItems, onClick, addToast }) {
  const days = daysSince(app.created_at)
  const isApproved = app.status === 'approved'
  const applyItem = isApproved ? applyItems?.find(i => i.application_id === app.id) : null
  const [marking, setMarking] = useState(false)

  const applyNow = async (e) => {
    e.stopPropagation()
    if (!applyItem) return
    setMarking(true)
    try {
      await fetch(`/api/apply-queue/${applyItem.id}/mark-applied`, { method: 'POST' })
      addToast('Marked as applied!', 'success')
      setTimeout(() => window.location.reload(), 800)
    } catch { addToast('Failed.', 'error') }
    setMarking(false)
  }

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        cursor: 'pointer',
        marginBottom: 8,
        padding: 12,
        transition: 'border-color 0.1s',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-hi)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {app.company || '—'}
      </div>
      <div style={{ color: 'var(--text-2)', fontSize: 12, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {app.role || '—'}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <ScoreDots score={app.fit_score} />
        {days != null && <span style={{ color: 'var(--text-3)', fontSize: 10 }}>{days === 0 ? 'Today' : `${days}d`}</span>}
      </div>
      {isApproved && applyItem && (
        <button
          className="btn btn-sm"
          onClick={applyNow}
          disabled={marking}
          style={{ marginTop: 8, width: '100%', fontSize: 11 }}
        >
          {marking ? '...' : 'Apply Now →'}
        </button>
      )}
    </div>
  )
}

function TableRow({ app, onClick }) {
  const color = app.fit_score >= 8 ? 'var(--green)' : app.fit_score >= 6 ? 'var(--yellow)' : 'var(--red)'
  const days = daysSince(app.created_at)
  const statusColors = {
    discovered: 'var(--text-3)', applied: 'var(--blue)', responded: 'var(--yellow)',
    interview: 'var(--green)', offer: 'var(--purple)', rejected: 'var(--red)', approved: 'var(--yellow)'
  }
  return (
    <tr
      onClick={onClick}
      style={{ cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--card)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <td style={{ padding: '10px 12px', fontWeight: 500 }}>{app.company || '—'}</td>
      <td style={{ padding: '10px 12px', color: 'var(--text-2)' }}>{app.role || '—'}</td>
      <td style={{ padding: '10px 12px' }}>
        {app.fit_score != null && <span style={{ color, fontWeight: 700 }}>{app.fit_score}</span>}
      </td>
      <td style={{ padding: '10px 12px' }}>
        <span className="status-badge" style={{ background: (statusColors[app.status] || 'var(--text-3)') + '22', color: statusColors[app.status] || 'var(--text-3)' }}>
          {(app.status || '').toUpperCase()}
        </span>
      </td>
      <td style={{ padding: '10px 12px', color: 'var(--text-3)', fontSize: 12 }}>
        {days != null ? (days === 0 ? 'Today' : `${days}d ago`) : '—'}
      </td>
    </tr>
  )
}

export default function PipelinePage({ addToast }) {
  const [apps, setApps] = useState([])
  const [applyItems, setApplyItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [search, setSearch] = useState('')
  const [view, setView] = useState('kanban')
  const [sortBy, setSortBy] = useState('newest')
  const [verdictFilter, setVerdictFilter] = useState('all')

  const load = () => {
    Promise.all([
      fetch('/api/applications').then(r => r.json()),
      fetch('/api/apply-queue').then(r => r.json()).catch(() => []),
    ]).then(([appData, aq]) => {
      setApps(appData)
      setApplyItems(aq)
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = apps
    .filter(a => {
      if (search) {
        const q = search.toLowerCase()
        if (!(a.company || '').toLowerCase().includes(q) && !(a.role || '').toLowerCase().includes(q)) return false
      }
      if (verdictFilter !== 'all') {
        const verdictMap = {
          strong: 'STRONG MATCH',
          good: 'GOOD MATCH',
          stretch: 'STRETCH',
        }
        if ((a.verdict || '') !== verdictMap[verdictFilter]) return false
      }
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'score') return (b.fit_score || 0) - (a.fit_score || 0)
      if (sortBy === 'company') return (a.company || '').localeCompare(b.company || '')
      return new Date(b.created_at) - new Date(a.created_at)
    })

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <span className="spinner" style={{ width: 24, height: 24 }} />
    </div>
  )

  return (
    <div style={{ padding: '28px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Pipeline</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', display: 'flex', overflow: 'hidden' }}>
            {['kanban', 'table'].map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  background: view === v ? 'var(--card-hover)' : 'transparent',
                  border: 'none',
                  color: view === v ? 'var(--text)' : 'var(--text-3)',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: view === v ? 600 : 400,
                  padding: '6px 12px',
                }}
              >
                {v === 'kanban' ? '⊞ Kanban' : '≡ Table'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          className="form-input"
          placeholder="Search company or role..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 240, margin: 0 }}
        />
        <select className="form-select" value={verdictFilter} onChange={e => setVerdictFilter(e.target.value)} style={{ width: 'auto', margin: 0 }}>
          <option value="all">All Verdicts</option>
          <option value="strong">Strong Match</option>
          <option value="good">Good Match</option>
          <option value="stretch">Stretch</option>
        </select>
        <select className="form-select" value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ width: 'auto', margin: 0 }}>
          <option value="newest">Newest First</option>
          <option value="score">By Score</option>
          <option value="company">Company A–Z</option>
        </select>
      </div>

      {apps.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-title">No applications yet</div>
          <div className="empty-state-sub">Use "Find a Job" to score your first job.</div>
        </div>
      ) : view === 'kanban' ? (
        <div className="kanban">
          {COLUMNS.map(col => {
            const colApps = filtered.filter(a => col.statuses.includes(a.status))
            return (
              <div key={col.id} className="kanban-col">
                <div className="kanban-col-header">
                  <span style={{ color: col.color }}>{col.label}</span>
                  <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>({colApps.length})</span>
                </div>
                <div className="kanban-lane">
                  {colApps.length > 0 ? (
                    colApps.map(app => (
                      <KanbanCard
                        key={app.id}
                        app={app}
                        applyItems={applyItems}
                        onClick={() => setSelectedId(app.id)}
                        addToast={addToast}
                      />
                    ))
                  ) : (
                    <div style={{ color: 'var(--text-3)', fontSize: 12, padding: '24px 10px', textAlign: 'center' }}>—</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-hi)' }}>
                {['Company', 'Role', 'Score', 'Status', 'Added'].map(h => (
                  <th key={h} style={{ color: 'var(--text-3)', fontSize: 11, fontWeight: 600, letterSpacing: '0.4px', padding: '10px 12px', textAlign: 'left', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(app => (
                <TableRow key={app.id} app={app} onClick={() => setSelectedId(app.id)} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedId && (
        <ApplicationDetail
          appId={selectedId}
          onClose={() => { setSelectedId(null); load() }}
          addToast={addToast}
        />
      )}
    </div>
  )
}
