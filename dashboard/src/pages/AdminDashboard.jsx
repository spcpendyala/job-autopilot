import { useState, useEffect } from 'react'

function timeAgo(ts) {
  if (!ts) return '—'
  const diff = Date.now() - new Date(ts).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return 'just now'
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function fmt(n, dec = 2) {
  if (n == null || isNaN(n)) return '—'
  return Number(n).toFixed(dec)
}

function StatChip({ label, value, color = 'var(--text)' }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '10px 16px', minWidth: 100,
    }}>
      <div style={{ fontSize: 20, fontWeight: 700, color }}>{value ?? '—'}</div>
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{label}</div>
    </div>
  )
}

export default function AdminDashboard({ addToast }) {
  const [stats, setStats]           = useState(null)
  const [usage, setUsage]           = useState(null)
  const [users, setUsers]           = useState(null)
  const [config, setConfig]         = useState(null)
  const [configForm, setConfigForm] = useState({})
  const [forbidden, setForbidden]   = useState(false)
  const [saving, setSaving]         = useState(false)
  const [runningAll, setRunningAll] = useState(false)
  const [discoverResult, setDiscoverResult] = useState(null)
  const [pendingActions, setPendingActions] = useState({})
  const [limitEdits, setLimitEdits] = useState({})
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [feedback, setFeedback] = useState([])
  const [fbFilter, setFbFilter] = useState('all')

  const loadAll = () => {
    Promise.all([
      fetch('/api/admin/stats').then(r => { if (r.status === 403) throw new Error('forbidden'); return r.json(); }),
      fetch('/api/admin/usage').then(r => r.json()),
      fetch('/api/admin/users').then(r => r.json()),
      fetch('/api/admin/config').then(r => r.json()),
    ]).then(([statsData, usageData, usersData, configData]) => {
      setStats(statsData)
      setUsage(usageData || { byAgent: [], totals: {}, daily: [] })
      setUsers(usersData?.users || [])
      setConfig(configData)
      setConfigForm(configData || {})
    }).catch(e => {
      if (e.message === 'forbidden') setForbidden(true)
    })
  }

  useEffect(() => {
    loadAll()
    fetch('/api/admin/feedback').then(r => r.json()).then(d => setFeedback(d?.feedback || [])).catch(() => {})
  }, [])

  const doAction = async (userId, action, body = {}) => {
    setPendingActions(p => ({ ...p, [userId]: action }))
    try {
      const r = await fetch(`/api/admin/users/${userId}/${action}`, {
        method: action === 'delete' ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: action === 'delete' ? undefined : JSON.stringify(body),
      })
      const d = await r.json()
      if (d.error) throw new Error(d.error)
      addToast?.(`${action} successful`)
      loadAll()
    } catch (e) {
      addToast?.(e.message, 'error')
    } finally {
      setPendingActions(p => { const n = { ...p }; delete n[userId]; return n })
      setDeleteConfirm(null)
    }
  }

  const saveConfig = async () => {
    setSaving(true)
    try {
      const r = await fetch('/api/admin/config', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configForm),
      })
      const d = await r.json()
      if (d.error) throw new Error(d.error)
      setConfig(d.config)
      addToast?.('Configuration saved')
    } catch (e) { addToast?.(e.message, 'error') }
    finally { setSaving(false) }
  }

  if (forbidden) return (
    <div style={{ textAlign: 'center', paddingTop: 80, color: 'var(--red)', fontSize: 18 }}>
      ⛔ Admin access required
    </div>
  )
  if (!stats) return (
    <div style={{ padding: 32, textAlign: 'center', paddingTop: 80 }}>
      <span className="spinner" />
    </div>
  )

  const card = {
    background: 'var(--card)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)', padding: 24, marginBottom: 20,
  }
  const sectionTitle = {
    fontSize: 13, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.5px', color: 'var(--text-2)',
    borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 20,
  }

  const totalCost = usage?.totals?.total_cost || 0
  const totalCalls = usage?.totals?.call_count || 0
  const uptimeH = Math.floor((stats.uptimeSeconds || 0) / 3600)

  return (
    <div style={{ padding: 32, maxWidth: 980 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Admin Console</h1>
      <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 28 }}>
        System operations · {stats.betaMode ? 'Beta (Haiku)' : 'Production (Sonnet)'} · Uptime {uptimeH}h · {stats.nodeVersion}
      </div>

      {/* ── 1. System Health ───────────────────────────────────── */}
      <div style={card}>
        <div style={sectionTitle}>System Health</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
          <StatChip label="Total Users"   value={stats.totalUsers}   color="var(--blue)" />
          <StatChip label="Active"        value={stats.activeUsers}  color="var(--green)" />
          <StatChip label="Blocked"       value={stats.blockedUsers} color="var(--red)" />
          <StatChip label="Total Apps"    value={stats.totalApps}    color="var(--text)" />
          <StatChip label="Interviews"    value={stats.totalQueued}  color="var(--yellow)" />
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 13 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: stats.discoveryEnabled ? 'var(--green-dim)' : 'var(--surface)',
            color: stats.discoveryEnabled ? 'var(--green)' : 'var(--text-3)',
            border: `1px solid ${stats.discoveryEnabled ? 'var(--green)' : 'var(--border)'}`,
            borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 600,
          }}>
            {stats.discoveryEnabled ? '● Discovery ON' : '○ Discovery OFF'}
          </span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: stats.betaMode ? 'var(--yellow-dim, rgba(234,179,8,0.1))' : 'var(--blue-dim)',
            color: stats.betaMode ? 'var(--yellow)' : 'var(--blue)',
            border: `1px solid ${stats.betaMode ? 'rgba(234,179,8,0.4)' : 'var(--blue)'}`,
            borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 600,
          }}>
            {stats.betaMode ? 'BETA MODE' : 'PRODUCTION'}
          </span>
        </div>
      </div>

      {/* ── 2. API Usage ───────────────────────────────────────── */}
      <div style={card}>
        <div style={{ ...sectionTitle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>API Usage</span>
          <a
            href="/api/admin/usage/export"
            style={{ fontSize: 12, color: 'var(--blue)', textDecoration: 'none', fontWeight: 400, textTransform: 'none' }}
          >
            Export CSV ↓
          </a>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
          <StatChip label="Total Cost"   value={`$${fmt(totalCost, 4)}`}  color="var(--green)" />
          <StatChip label="Total Calls"  value={totalCalls}                color="var(--blue)" />
          <StatChip label="Input Tokens" value={((usage?.totals?.total_input || 0) / 1000).toFixed(1) + 'K'} color="var(--text)" />
          <StatChip label="Output Tokens" value={((usage?.totals?.total_output || 0) / 1000).toFixed(1) + 'K'} color="var(--text)" />
        </div>

        {usage?.daily?.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8 }}>Last 14 days</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {usage.daily.map(row => {
                const pct = totalCost > 0 ? Math.max(4, Math.round((row.cost / totalCost) * 100)) : 4
                return (
                  <div key={row.date} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-3)', width: 80, flexShrink: 0 }}>{row.date}</span>
                    <div style={{ height: 14, borderRadius: 3, background: 'var(--blue)', opacity: 0.7, width: `${pct}%`, minWidth: 4 }} />
                    <span style={{ fontSize: 11, color: 'var(--text-2)' }}>${fmt(row.cost, 4)} · {row.calls} calls</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {usage?.byAgent?.length > 0 && (
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8 }}>By agent</div>
            <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {usage.byAgent.map((row, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, color: 'var(--text-2)', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ flex: 1 }}>{row.agent}</span>
                  <span style={{ color: 'var(--text-3)' }}>{row.model?.split('-')[1] || row.model}</span>
                  <span>{row.call_count} calls</span>
                  <span style={{ color: 'var(--green)', minWidth: 70, textAlign: 'right' }}>${fmt(row.total_cost, 4)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {totalCalls === 0 && (
          <p style={{ color: 'var(--text-3)', fontSize: 13 }}>No API calls logged yet. Usage tracking starts after the next AI request.</p>
        )}
      </div>

      {/* ── 3. User Management ─────────────────────────────────── */}
      <div style={card}>
        <div style={{ ...sectionTitle, display: 'flex', alignItems: 'center', gap: 10 }}>
          User Management
          <span style={{
            background: 'var(--blue-dim)', color: 'var(--blue)',
            borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 400,
          }}>{users?.length || 0}</span>
        </div>

        {users?.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {users.map(u => {
              const isBlocked = u.accountStatus === 'blocked'
              const busy = pendingActions[u.id]
              const limitVal = limitEdits[u.id] !== undefined ? limitEdits[u.id] : (u.jobsPerDayLimit || 0)
              return (
                <div key={u.id} style={{
                  border: '1px solid', borderRadius: 10, padding: '12px 16px',
                  borderColor: isBlocked ? 'rgba(239,68,68,0.3)' : 'var(--border)',
                  background: isBlocked ? 'rgba(239,68,68,0.04)' : 'var(--surface)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{u.displayName}</span>
                        {u.isAdmin && <span style={{ background: 'var(--blue-dim)', color: 'var(--blue)', fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 12 }}>ADMIN</span>}
                        {isBlocked && <span style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--red)', fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 12 }}>BLOCKED</span>}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{u.email || '—'}</div>
                    </div>

                    <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--text-2)', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span><strong style={{ color: 'var(--text)' }}>{u.stats?.total || 0}</strong> apps</span>
                      <span style={{ color: u.profileApproved ? 'var(--green)' : 'var(--yellow)' }}>
                        {u.profileApproved ? 'Profile ✓' : 'No profile'}
                      </span>
                      {u.daysSinceActive !== null ? (
                        <span>
                          Last active: {u.daysSinceActive === 0 ? 'today' : `${u.daysSinceActive}d ago`}
                          {u.daysSinceActive > 7 && <span style={{ marginLeft: 4, background: 'rgba(234,179,8,0.15)', color: '#f59e0b', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10 }}>IDLE</span>}
                        </span>
                      ) : <span style={{ color: 'var(--text-3)' }}>Never active</span>}
                      <span style={{ color: 'var(--text-3)' }}>Mode: {u.discoveryMode || 'manual'}</span>
                    </div>

                    {!u.isAdmin && (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>limit/day:</span>
                          <input
                            type="number" min={0} max={50} value={limitVal}
                            onChange={e => setLimitEdits(l => ({ ...l, [u.id]: parseInt(e.target.value) || 0 }))}
                            onBlur={() => {
                              if (limitEdits[u.id] !== undefined && limitEdits[u.id] !== u.jobsPerDayLimit) {
                                doAction(u.id, 'limit', { jobsPerDayLimit: limitEdits[u.id] })
                                  .then(() => setLimitEdits(l => { const n = { ...l }; delete n[u.id]; return n }))
                              }
                            }}
                            style={{
                              width: 50, padding: '3px 6px', fontSize: 12, textAlign: 'center',
                              background: 'var(--bg)', border: '1px solid var(--border-hi)',
                              borderRadius: 5, color: 'var(--text)',
                            }}
                          />
                        </div>
                        <button
                          type="button" disabled={!!busy}
                          onClick={() => doAction(u.id, isBlocked ? 'unblock' : 'block')}
                          style={{
                            fontSize: 12, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                            border: '1px solid', background: 'none',
                            borderColor: isBlocked ? 'var(--green)' : 'rgba(239,68,68,0.5)',
                            color: isBlocked ? 'var(--green)' : 'var(--red)',
                          }}
                        >
                          {busy === 'block' || busy === 'unblock' ? '…' : isBlocked ? 'Unblock' : 'Block'}
                        </button>
                        {deleteConfirm !== u.id ? (
                          <button type="button" disabled={!!busy}
                            onClick={() => setDeleteConfirm(u.id)}
                            style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, cursor: 'pointer', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--red)', background: 'none' }}
                          >Delete</button>
                        ) : (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button type="button" onClick={() => doAction(u.id, 'delete')}
                              style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, cursor: 'pointer', background: 'var(--red)', border: 'none', color: '#fff' }}
                            >{busy === 'delete' ? '…' : 'Confirm'}</button>
                            <button type="button" onClick={() => setDeleteConfirm(null)}
                              style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, cursor: 'pointer', border: '1px solid var(--border-hi)', color: 'var(--text-2)', background: 'none' }}
                            >Cancel</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p style={{ color: 'var(--text-3)', textAlign: 'center', padding: 24 }}>No users yet.</p>
        )}
      </div>

      {/* ── 4. System Configuration ────────────────────────────── */}
      <div style={card}>
        <div style={sectionTitle}>System Configuration</div>

        <div style={{ marginBottom: 16 }}>
          <label className="form-label">AI Model</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { label: 'Beta — Haiku (fast, cheap)', value: true },
              { label: 'Production — Sonnet (quality)', value: false },
            ].map(opt => (
              <button key={String(opt.value)}
                onClick={() => setConfigForm(f => ({ ...f, betaMode: opt.value }))}
                style={{
                  flex: 1, padding: '10px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
                  background: configForm.betaMode === opt.value ? 'var(--green-dim)' : 'transparent',
                  border: configForm.betaMode === opt.value ? '1px solid var(--green)' : '1px solid var(--border)',
                  color: configForm.betaMode === opt.value ? 'var(--green)' : 'var(--text-2)',
                }}>{opt.label}</button>
            ))}
          </div>
        </div>

        {[
          { key: 'autoTailorThreshold', label: `Auto-tailor threshold: ${configForm.autoTailorThreshold ?? 7.5}`, min: 5, max: 10 },
          { key: 'minScoreToShow', label: `Min score to show: ${configForm.minScoreToShow ?? 6.0}`, min: 1, max: 10 },
        ].map(({ key, label, min, max }) => (
          <div key={key} style={{ marginBottom: 16 }}>
            <label className="form-label">{label}</label>
            <input type="range" min={min} max={max} step={0.5}
              value={configForm[key] ?? (key === 'autoTailorThreshold' ? 7.5 : 6.0)}
              onChange={e => setConfigForm(f => ({ ...f, [key]: parseFloat(e.target.value) }))}
              style={{ width: '100%', accentColor: 'var(--blue)' }} />
          </div>
        ))}

        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, marginBottom: 20 }}>
          <input type="checkbox" checked={!!configForm.discoveryEnabled}
            onChange={e => setConfigForm(f => ({ ...f, discoveryEnabled: e.target.checked }))} />
          Discovery enabled
        </label>
        <button className="btn" onClick={saveConfig} disabled={saving}>
          {saving ? 'Saving…' : 'Save Configuration'}
        </button>
      </div>

      {/* ── 5. Quick Actions ───────────────────────────────────── */}
      <div style={card}>
        <div style={sectionTitle}>Quick Actions</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn" onClick={async () => {
            try {
              const r = await fetch('/api/discover', { method: 'POST' })
              const d = await r.json()
              setDiscoverResult(d)
              addToast?.(`Discovery: ${d.discovered ?? 0} found, ${d.queued ?? 0} queued`)
            } catch { addToast?.('Discovery failed', 'error') }
          }}>
            🔍 Run My Discovery
          </button>

          <button className="btn btn-ghost" disabled={runningAll} onClick={async () => {
            setRunningAll(true)
            try {
              const r = await fetch('/api/admin/run-discovery', { method: 'POST' })
              const d = await r.json()
              setDiscoverResult(d)
              addToast?.(d.message || 'Discovery queued for all users')
            } catch { addToast?.('Failed', 'error') }
            finally { setRunningAll(false) }
          }}>
            {runningAll ? <><span className="spinner" style={{ marginRight: 8 }} />Running…</> : '🌐 Run for All Users'}
          </button>

          <a href="/api/applications/export-csv" className="btn btn-ghost" style={{ textDecoration: 'none' }}>
            📊 Export Applications CSV
          </a>
        </div>
        {discoverResult && (
          <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text-2)' }}>
            {discoverResult.error
              ? `Error: ${discoverResult.error}`
              : discoverResult.message || `Found ${discoverResult.discovered ?? 0} · Scored ${discoverResult.scored ?? 0} · Queued ${discoverResult.queued ?? 0}`}
          </div>
        )}
      </div>

      {/* Feedback Section */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, marginTop: 24 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>User Feedback</h3>
        {(() => {
          const unresolved = feedback.filter(f => !f.resolved)
          const broken = feedback.filter(f => f.severity === 'broken')
          const pageFreq = {}
          broken.forEach(f => { pageFreq[f.page || '/'] = (pageFreq[f.page || '/'] || 0) + 1 })
          const mostBroken = Object.entries(pageFreq).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'
          const filtered = feedback.filter(f => {
            if (fbFilter === 'broken') return f.severity === 'broken'
            if (fbFilter === 'unresolved') return !f.resolved
            return true
          })
          return (
            <>
              <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 10 }}>
                {unresolved.length} unresolved | Most broken page: <b>{mostBroken}</b>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {['all', 'broken', 'unresolved'].map(f => (
                  <button key={f} className={`btn btn-sm ${fbFilter === f ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setFbFilter(f)}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
              {filtered.length === 0 ? (
                <div style={{ color: 'var(--text-3)', fontSize: 13 }}>No feedback yet.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ color: 'var(--text-3)', textAlign: 'left' }}>
                      {['Time', 'Page', 'Tried', 'Result', 'Severity', ''].map(h => (
                        <th key={h} style={{ padding: '4px 8px', borderBottom: '1px solid var(--border)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(f => (
                      <tr key={f.id} style={{ opacity: f.resolved ? 0.5 : 1 }}>
                        <td style={{ padding: '6px 8px', color: 'var(--text-3)' }}>{f.timestamp ? new Date(f.timestamp).toLocaleDateString() : '—'}</td>
                        <td style={{ padding: '6px 8px' }}>{f.page || '—'}</td>
                        <td style={{ padding: '6px 8px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.tried || '—'}</td>
                        <td style={{ padding: '6px 8px' }}>{f.worked || '—'}</td>
                        <td style={{ padding: '6px 8px' }}>{f.severity ? `${f.severity === 'broken' ? '🔴' : f.severity === 'annoying' ? '🟡' : '🟢'} ${f.severity}` : '—'}</td>
                        <td style={{ padding: '6px 8px' }}>
                          {!f.resolved && (
                            <button className="btn btn-sm btn-ghost" onClick={async () => {
                              await fetch(`/api/admin/feedback/${f.id}/resolve`, { method: 'POST' })
                              setFeedback(fb => fb.map(x => x.id === f.id ? { ...x, resolved: 1 } : x))
                            }}>Resolve</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )
        })()}
      </div>
    </div>
  )
}
