import { useState, useEffect } from 'react'
import ApplicationDetail from './ApplicationDetail'

function scoreColor(score) {
  if (score >= 8) return '#22c55e'
  if (score >= 6) return '#eab308'
  return '#ef4444'
}

function StatusPill({ status }) {
  const map = {
    discovered:             { bg: '#2a2a2a', color: '#888' },
    applied:                { bg: '#1e3a5f', color: '#3b82f6' },
    responded:              { bg: '#3d2e00', color: '#eab308' },
    interview:              { bg: '#14332a', color: '#22c55e' },
    'interview-prep-ready': { bg: '#14332a', color: '#22c55e' },
    rejected:               { bg: '#3d1515', color: '#ef4444' },
    offer:                  { bg: '#2d1a5e', color: '#a855f7' },
  }
  const s = map[status] || map.discovered
  return (
    <span style={{ background: s.bg, color: s.color, borderRadius: 100, fontSize: 11, fontWeight: 600, padding: '3px 10px', display: 'inline-block' }}>
      {status}
    </span>
  )
}

function VerdictBadge({ verdict }) {
  const map = {
    'STRONG MATCH': '#22c55e',
    'GOOD MATCH':   '#eab308',
    'WEAK MATCH':   '#ef4444',
    'NO MATCH':     '#ef4444',
  }
  const color = map[verdict] || '#888'
  return (
    <span style={{ background: color + '22', color, borderRadius: 4, fontSize: 11, fontWeight: 600, padding: '2px 8px' }}>
      {verdict}
    </span>
  )
}

export default function Pipeline({ onApply }) {
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)

  const load = () => {
    fetch('/api/applications')
      .then(r => r.json())
      .then(data => { setApps(data); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    load()
    const timer = setInterval(load, 30000)
    return () => clearInterval(timer)
  }, [])

  if (loading) return <div className="empty"><span className="spinner" /></div>
  if (!apps.length) return <div className="empty">No applications yet. Use the Analyze tab to score your first job.</div>

  return (
    <>
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th>Role</th>
              <th>Score</th>
              <th>Verdict</th>
              <th>Status</th>
              <th>Added</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {apps.map(app => (
              <tr key={app.id} onClick={() => setSelectedId(app.id)}>
                <td style={{ fontWeight: 600 }}>{app.company || '—'}</td>
                <td style={{ color: '#d0d0d0' }}>{app.role || '—'}</td>
                <td>
                  {app.fit_score != null
                    ? <span style={{ color: scoreColor(app.fit_score), fontWeight: 700, fontSize: 16 }}>{app.fit_score}</span>
                    : <span style={{ color: '#888' }}>—</span>}
                </td>
                <td>{app.verdict ? <VerdictBadge verdict={app.verdict} /> : '—'}</td>
                <td><StatusPill status={app.status} /></td>
                <td style={{ color: '#888', fontSize: 12 }}>{app.created_at ? app.created_at.slice(0, 10) : '—'}</td>
                <td>
                  <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); setSelectedId(app.id) }}>
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedId && (
        <ApplicationDetail
          appId={selectedId}
          onClose={() => { setSelectedId(null); load() }}
        />
      )}
    </>
  )
}
