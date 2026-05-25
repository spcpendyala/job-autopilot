import { useState, useEffect } from 'react'

function timeAgo(ts) {
  if (!ts) return '—'
  const diff = Date.now() - new Date(ts).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return 'just now'
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h/24)}d ago`
}

export default function AdminDashboard({ addToast }) {
  const [users, setUsers] = useState(null)
  const [config, setConfig] = useState(null)
  const [configForm, setConfigForm] = useState({})
  const [forbidden, setForbidden] = useState(false)
  const [saving, setSaving] = useState(false)
  const [runningDiscover, setRunningDiscover] = useState(false)
  const [discoverResult, setDiscoverResult] = useState(null)

  useEffect(() => {
    fetch('/api/admin/users').then(r => {
      if (r.status === 403) { setForbidden(true); return null }
      return r.json()
    }).then(d => { if (d) setUsers(d.users || []) }).catch(() => setForbidden(true))

    fetch('/api/admin/config').then(r => {
      if (r.status === 403) { setForbidden(true); return null }
      return r.json()
    }).then(d => { if (d) { setConfig(d); setConfigForm(d) } }).catch(() => {})
  }, [])

  const saveConfig = async () => {
    setSaving(true)
    try {
      const r = await fetch('/api/admin/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(configForm) })
      const d = await r.json()
      if (d.error) throw new Error(d.error)
      setConfig(d.config)
      addToast && addToast('Configuration saved!')
    } catch (e) { addToast && addToast(e.message, 'error') }
    finally { setSaving(false) }
  }

  const runDiscover = async () => {
    setRunningDiscover(true)
    try {
      const r = await fetch('/api/discover', { method: 'POST' })
      const d = await r.json()
      setDiscoverResult(d)
    } catch { setDiscoverResult({ error: 'Failed' }) }
    finally { setRunningDiscover(false) }
  }

  if (forbidden) return <div style={{ textAlign: 'center', paddingTop: 80, color: '#ef4444', fontSize: 18 }}>⛔ Admin access required</div>
  if (!config) return <div style={{ padding: 32, textAlign: 'center', paddingTop: 80 }}><span className="spinner" /></div>

  const totalApps = (users || []).reduce((s, u) => s + (u.stats?.total || 0), 0)
  const avgApps = users?.length ? Math.round(totalApps / users.length) : 0

  const card = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24, marginBottom: 20 }
  const sectionHeader = { fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-2)', borderBottom: '1px solid var(--border)', marginBottom: 20, paddingBottom: 12 }

  return (
    <div style={{ padding: 32, maxWidth: 900 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Admin Dashboard</h1>

      {/* Card A — Users */}
      <div style={card}>
        <div style={{ ...sectionHeader, display: 'flex', alignItems: 'center', gap: 10 }}>
          Users
          <span style={{ background: 'var(--blue-dim,#0f1923)', color: '#3b82f6', borderRadius: 20, padding: '2px 10px', fontSize: 12 }}>{users?.length || 0}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total Users', value: users?.length || 0, color: '#3b82f6' },
            { label: 'Total Applications', value: totalApps, color: '#22c55e' },
            { label: 'Avg Apps / User', value: avgApps, color: '#f59e0b' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: '#0f1923', border: '1px solid #1e3a5f', borderRadius: 8, padding: '12px 16px' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
              <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
        {users?.length ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['Name','Email','Joined','Apps','Profile','Last Active'].map(h => (
                <th key={h} style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', textAlign: 'left', padding: '0 0 10px', fontWeight: 600, letterSpacing: '0.5px' }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                  <td style={{ padding: '12px 0', fontWeight: 600, color: '#f0f0f0', fontSize: 14 }}>{u.displayName || u.id}</td>
                  <td style={{ padding: '12px 0', color: '#999', fontSize: 13 }}>{u.email || '—'}</td>
                  <td style={{ padding: '12px 0', color: '#666', fontSize: 13 }}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
                  <td style={{ padding: '12px 0', color: '#ccc', fontSize: 14 }}>{u.stats?.total || 0}</td>
                  <td style={{ padding: '12px 0' }}>
                    <span style={{ background: u.profileApproved ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)', color: u.profileApproved ? '#22c55e' : '#f59e0b', padding: '2px 8px', borderRadius: 12, fontSize: 12 }}>
                      {u.profileApproved ? 'Approved' : 'Pending'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 0', color: '#555', fontSize: 13 }}>{timeAgo(u.lastActive)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: '#555', textAlign: 'center', padding: 24 }}>No users signed up yet.</p>
        )}
      </div>

      {/* Card B — System Config */}
      <div style={card}>
        <div style={sectionHeader}>System Configuration</div>
        <div style={{ marginBottom: 16 }}>
          <label className="form-label">AI Model</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { label: 'Beta — Haiku (fast, cheap)', value: true },
              { label: 'Production — Sonnet (quality)', value: false },
            ].map(opt => (
              <button key={String(opt.value)} onClick={() => setConfigForm(f => ({ ...f, betaMode: opt.value }))}
                style={{ flex: 1, padding: '10px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, background: configForm.betaMode === opt.value ? '#0a1f0a' : 'transparent', border: configForm.betaMode === opt.value ? '1px solid #22c55e' : '1px solid #242424', color: configForm.betaMode === opt.value ? '#22c55e' : '#999' }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        {[
          { key: 'autoTailorThreshold', label: `Auto-tailor threshold: ${configForm.autoTailorThreshold || 7.5}`, min: 5, max: 10 },
          { key: 'minScoreToShow', label: `Min score to show: ${configForm.minScoreToShow || 6.0}`, min: 1, max: 10 },
        ].map(({ key, label, min, max }) => (
          <div key={key} style={{ marginBottom: 16 }}>
            <label className="form-label">{label}</label>
            <input type="range" min={min} max={max} step={0.5} value={configForm[key] || (key === 'autoTailorThreshold' ? 7.5 : 6.0)}
              onChange={e => setConfigForm(f => ({ ...f, [key]: parseFloat(e.target.value) }))}
              style={{ width: '100%', accentColor: 'var(--blue)' }} />
          </div>
        ))}
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, marginBottom: 20 }}>
          <input type="checkbox" checked={!!configForm.discoveryEnabled}
            onChange={e => setConfigForm(f => ({ ...f, discoveryEnabled: e.target.checked }))} />
          Discovery enabled
        </label>
        <button className="btn" onClick={saveConfig} disabled={saving}>{saving ? 'Saving...' : 'Save Configuration'}</button>
      </div>

      {/* Card C — Discovery */}
      <div style={card}>
        <div style={sectionHeader}>Discovery</div>
        <div style={{ marginBottom: 12, fontSize: 13, color: '#999' }}>Last run: <span style={{ color: '#ccc' }}>{timeAgo(config.lastMorningBriefAt)}</span></div>
        {(config.watchedCompanies || []).length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 6 }}>Watched Companies</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {config.watchedCompanies.map((c, i) => <span key={i} className="tag" style={{ fontSize: 12 }}>{c}</span>)}
            </div>
          </div>
        )}
        <button className="btn" onClick={runDiscover} disabled={runningDiscover} style={{ marginTop: 8 }}>
          {runningDiscover ? <><span className="spinner" style={{ marginRight: 8 }} />Running...</> : '🔍 Run Discovery Now'}
        </button>
        {discoverResult && (
          <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text-2)' }}>
            {discoverResult.error ? `Error: ${discoverResult.error}` : `Fetched ${discoverResult.discovered||0} · Scored ${discoverResult.scored||0} · Queued ${discoverResult.queued||0}`}
          </div>
        )}
      </div>

      {/* Card D — AI Engine */}
      <div style={card}>
        <div style={sectionHeader}>AI Engine</div>
        <div style={{ fontSize: 14, color: '#ccc', marginBottom: 8 }}>Current model: <strong>{config.betaMode ? 'Haiku 4.5 (Beta Mode)' : 'Sonnet 4 (Production)'}</strong></div>
        <div style={{ fontSize: 13, color: '#555', marginBottom: 4 }}>claude-sonnet-4-20250514 / claude-haiku-4-5-20251001</div>
        <div style={{ fontSize: 12, color: '#444', marginTop: 8 }}>Switch model in System Configuration above</div>
      </div>
    </div>
  )
}
