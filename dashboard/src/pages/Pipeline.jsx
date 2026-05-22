import { useState, useEffect } from 'react'
import ApplicationDetail from '../components/ApplicationDetail'

const COLUMNS = [
  { id: 'discovered', label: 'DISCOVERED',    color: '#888',    statuses: ['discovered'] },
  { id: 'applied',    label: 'APPLIED',        color: '#3b82f6', statuses: ['applied'] },
  { id: 'responded',  label: 'RESPONDED',      color: '#eab308', statuses: ['responded', 'interview-prep-ready'] },
  { id: 'interview',  label: 'INTERVIEW',      color: '#22c55e', statuses: ['interview'] },
  { id: 'closed',     label: 'OFFER / CLOSED', color: '#a855f7', statuses: ['offer', 'rejected'] },
]

function scoreColor(score) {
  if (score >= 8) return '#22c55e'
  if (score >= 6) return '#eab308'
  return '#ef4444'
}

function daysSince(dateStr) {
  if (!dateStr) return null
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

function AppCard({ app, onClick }) {
  const days = daysSince(app.created_at)
  return (
    <div
      onClick={onClick}
      style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 10, cursor: 'pointer', marginBottom: 8, padding: 14, transition: 'border-color 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = '#3a3a3a'}
      onMouseLeave={e => e.currentTarget.style.borderColor = '#2a2a2a'}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
        <div style={{ fontWeight: 600, fontSize: 14, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{app.company || '—'}</div>
        {app.fit_score != null && (
          <span style={{ color: scoreColor(app.fit_score), fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{app.fit_score}/10</span>
        )}
      </div>
      <div style={{ color: '#888', fontSize: 12, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{app.role || '—'}</div>
      {days != null && (
        <div style={{ color: '#555', fontSize: 11 }}>{days === 0 ? 'Today' : `${days}d ago`}</div>
      )}
    </div>
  )
}

export default function PipelinePage({ addToast }) {
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [search, setSearch] = useState('')
  const [verdictFilter, setVerdictFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')

  const load = () => {
    fetch('/api/applications')
      .then(r => r.json())
      .then(d => { setApps(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = apps
    .filter(a => {
      if (!search) return true
      const q = search.toLowerCase()
      return (a.company || '').toLowerCase().includes(q) || (a.role || '').toLowerCase().includes(q)
    })
    .filter(a => {
      if (verdictFilter === 'strong') return a.verdict === 'STRONG MATCH'
      if (verdictFilter === 'good') return a.verdict === 'GOOD MATCH'
      if (verdictFilter === 'stretch') return ['WEAK MATCH', 'NO MATCH'].includes(a.verdict)
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'score') return (b.fit_score || 0) - (a.fit_score || 0)
      if (sortBy === 'company') return (a.company || '').localeCompare(b.company || '')
      return new Date(b.created_at) - new Date(a.created_at)
    })

  if (loading) return (
    <div style={{ padding: 32, textAlign: 'center', color: '#888', paddingTop: 80 }}>
      <span className="spinner" />
    </div>
  )

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20 }}>Pipeline</h1>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 24 }}>
        <input
          className="form-input"
          placeholder="Search company or role..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 260 }}
        />
        <select className="form-select" value={verdictFilter} onChange={e => setVerdictFilter(e.target.value)} style={{ width: 'auto' }}>
          <option value="all">All Matches</option>
          <option value="strong">Strong Match</option>
          <option value="good">Good Match</option>
          <option value="stretch">Stretch</option>
        </select>
        <select className="form-select" value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ width: 'auto' }}>
          <option value="newest">Newest First</option>
          <option value="score">By Fit Score</option>
          <option value="company">Company A–Z</option>
        </select>
      </div>

      {apps.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', border: '1px dashed #2a2a2a', borderRadius: 12 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📋</div>
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>No applications yet</div>
          <div style={{ color: '#888', fontSize: 14 }}>Use "Find a Job" to score your first job and build your pipeline.</div>
        </div>
      ) : (
        /* Kanban */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
          {COLUMNS.map(col => {
            const colApps = filtered.filter(a => col.statuses.includes(a.status))
            return (
              <div key={col.id} style={{ minWidth: 0 }}>
                <div style={{ color: col.color, fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{col.label}</span>
                  <span style={{ color: '#444', fontWeight: 400 }}>({colApps.length})</span>
                </div>
                <div style={{ background: '#0f0f0f', border: '1px dashed #2a2a2a', borderRadius: 10, minHeight: 100, padding: colApps.length ? 8 : 0 }}>
                  {colApps.length > 0 ? (
                    colApps.map(app => (
                      <AppCard key={app.id} app={app} onClick={() => setSelectedId(app.id)} />
                    ))
                  ) : (
                    <div style={{ color: '#444', fontSize: 12, padding: '28px 12px', textAlign: 'center' }}>
                      Nothing here yet
                    </div>
                  )}
                </div>
              </div>
            )
          })}
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
