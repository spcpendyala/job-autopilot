import { useState, useEffect } from 'react'

function Section({ title, children }) {
  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-2)', borderBottom: '1px solid var(--border)', marginBottom: 20, paddingBottom: 12 }}>{title}</h2>
      {children}
    </div>
  )
}

export default function Settings({ addToast }) {
  const [config, setConfig] = useState(null)
  const [discovering, setDiscovering] = useState(false)
  const [discoverResult, setDiscoverResult] = useState(null)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [setupStatus, setSetupStatus] = useState(null)

  const [gmailStatus, setGmailStatus] = useState(null)
  const [discoverStatus, setDiscoverStatus] = useState(null)

  useEffect(() => {
    fetch('/api/config').then(r => r.json()).then(setConfig).catch(() => setConfig({}))
    fetch('/api/setup-status').then(r => r.json()).then(setSetupStatus).catch(() => {})
    fetch('/api/inbox/gmail-status', { credentials: 'include' }).then(r => r.json()).then(setGmailStatus).catch(() => {})
    fetch('/api/discover/status').then(r => r.json()).then(setDiscoverStatus).catch(() => {})
  }, [])

  const patchConfig = async (patch) => {
    const updated = { ...config, ...patch }
    setConfig(updated)
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      })
    } catch { addToast('Failed to save setting.', 'error') }
  }

  const runDiscover = async () => {
    setDiscovering(true)
    setDiscoverResult(null)
    try {
      const r = await fetch('/api/discover', { method: 'POST' })
      const d = await r.json()
      setDiscoverResult(d)
      addToast(`Discovery complete: ${d.scored || 0} scored, ${d.queued || 0} queued.`, 'success')
    } catch { addToast('Discovery failed.', 'error') }
    finally { setDiscovering(false) }
  }

  const savePreferences = async () => {
    setSavingPrefs(true)
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      addToast('Preferences saved!', 'success')
    } catch { addToast('Failed to save.', 'error') }
    finally { setSavingPrefs(false) }
  }

  if (!config) return (
    <div style={{ padding: 32, textAlign: 'center', paddingTop: 80 }}>
      <span className="spinner" />
    </div>
  )

  return (
    <div style={{ padding: 32, maxWidth: 720 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Settings</h1>
      <div style={{ padding: '8px 0 24px', color: '#999', fontSize: 13 }}>
        To update your profile or upload resumes, go to the <strong style={{ color: '#f0f0f0' }}>Profile</strong> page.
      </div>

      {/* Connections */}
      <Section title="Connections">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: '#ccc', minWidth: 120 }}>Gmail</span>
            {gmailStatus?.connected
              ? <span style={{ color: 'var(--green)', fontSize: 13 }}>✓ Connected{gmailStatus.gmailEmail ? ` — ${gmailStatus.gmailEmail}` : ''}</span>
              : <><span style={{ color: 'var(--text-3)', fontSize: 13, marginRight: 10 }}>Not connected</span>
                  <a href="/auth/google/gmail" className="btn btn-ghost btn-sm">Connect Gmail →</a></>}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <span style={{ fontSize: 13, color: '#ccc', minWidth: 120 }}>Google Drive</span>
            {setupStatus?.checks?.driveConfigured
              ? <span style={{ color: 'var(--green)', fontSize: 13 }}>Connected — files sync to your Drive</span>
              : <span style={{ color: '#f59e0b', fontSize: 13 }}>Not connected — files stored on server only</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <span style={{ fontSize: 13, color: '#ccc', minWidth: 120 }}>Google Sheets</span>
            <span style={{ color: '#555', fontSize: 13 }}>Not required — export as CSV instead</span>
          </div>
        </div>
      </Section>

      {/* Section 1 — Discovery */}
      <Section title="Discovery">
        <div style={{ marginBottom: 20 }}>
          <label className="form-label">What I'm looking for</label>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {['Full-time', 'Contract', 'Remote', 'Freelance'].map(type => {
              const active = (config.opportunityTypes || []).includes(type.toLowerCase())
              return (
                <label key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={e => {
                      const types = config.opportunityTypes || []
                      patchConfig({ opportunityTypes: e.target.checked ? [...types, type.toLowerCase()] : types.filter(t => t !== type.toLowerCase()) })
                    }}
                  />
                  {type}
                </label>
              )
            })}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label className="form-label">Sources <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(auto-configured from your profile)</span></label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { name: 'Indeed', active: true },
              { name: 'Remote OK', active: true },
              { name: 'We Work Remotely', active: true },
              { name: 'Remotive', active: true },
            ].map(src => (
              <div key={src.name} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', fontSize: 14 }}>
                <span style={{ color: src.active ? 'var(--green)' : 'var(--text-3)' }}>■</span>
                {src.name}
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label className="form-label">Auto-tailor for jobs scoring ≥ {config.autoTailorThreshold || 7.5}</label>
          <input
            type="range"
            min={5} max={10} step={0.5}
            value={config.autoTailorThreshold || 7.5}
            onChange={e => setConfig(c => ({ ...c, autoTailorThreshold: parseFloat(e.target.value) }))}
            style={{ width: '100%', accentColor: 'var(--blue)' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-3)', fontSize: 11, marginTop: 2 }}>
            <span>5 — More tailoring</span>
            <span>10 — Only perfect fits</span>
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label className="form-label">Show jobs scoring ≥ {config.minScoreToShow || 6.0}</label>
          <input
            type="range"
            min={1} max={10} step={0.5}
            value={config.minScoreToShow || 6.0}
            onChange={e => setConfig(c => ({ ...c, minScoreToShow: parseFloat(e.target.value) }))}
            style={{ width: '100%', accentColor: 'var(--green)' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-3)', fontSize: 11, marginTop: 2 }}>
            <span>1 — Show everything</span>
            <span>10 — Only perfect fits</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn" onClick={runDiscover} disabled={discovering}>
            {discovering ? <><span className="spinner" style={{ marginRight: 8 }} />Running...</> : '🔍 Run Discovery Now'}
          </button>
          {(discoverStatus?.lastRun || config.lastMorningBriefAt) && (
            <span style={{ color: 'var(--text-3)', fontSize: 13 }}>
              Last run: {new Date(discoverStatus?.lastRun || config.lastMorningBriefAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button className="btn btn-ghost" onClick={savePreferences} disabled={savingPrefs} style={{ marginLeft: 'auto' }}>
            {savingPrefs ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>

        {discoverResult && (
          <div style={{ marginTop: 14, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', fontSize: 13, color: 'var(--text-2)' }}>
            Fetched {discoverResult.discovered || 0} · Scored {discoverResult.scored || 0} · Queued {discoverResult.queued || 0} for review
          </div>
        )}
      </Section>

      {/* Export */}
      <Section title="Export">
        <button className="btn" onClick={() => { window.location.href = '/api/applications/export-csv' }}>
          Export All Applications as CSV
        </button>
        <p style={{ fontSize: 12, color: '#555', marginTop: 8, marginBottom: 0 }}>Opens in Excel, Google Sheets, or any spreadsheet app</p>
      </Section>
    </div>
  )
}
