import { useState, useEffect } from 'react'

function Section({ title, children }) {
  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-2)', borderBottom: '1px solid var(--border)', marginBottom: 20, paddingBottom: 12 }}>{title}</h2>
      {children}
    </div>
  )
}

export default function Settings({ addToast, user }) {
  const [config, setConfig] = useState(null)
  const [discovering, setDiscovering] = useState(false)
  const [discoverResult, setDiscoverResult] = useState(null)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [setupStatus, setSetupStatus] = useState(null)
  const [deleteStep, setDeleteStep] = useState(0) // 0=hidden 1=confirm 2=deleting
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  const [gmailStatus, setGmailStatus] = useState(null)
  const [discoverStatus, setDiscoverStatus] = useState(null)
  const [profilePrefs, setProfilePrefs] = useState(null)
  const [sourcesData, setSourcesData] = useState(null)
  const [testingsources, setTestingSources] = useState(false)
  const [sourceTestResult, setSourceTestResult] = useState(null)

  useEffect(() => {
    fetch('/api/config').then(r => r.json()).then(setConfig).catch(() => setConfig({}))
    fetch('/api/setup-status').then(r => r.json()).then(setSetupStatus).catch(() => {})
    fetch('/api/inbox/gmail-status', { credentials: 'include' }).then(r => r.json()).then(setGmailStatus).catch(() => {})
    fetch('/api/discover/status').then(r => r.json()).then(setDiscoverStatus).catch(() => {})
    fetch('/api/discovery/sources', { credentials: 'include' }).then(r => r.json()).then(setSourcesData).catch(() => {})
    // Load profile preferences (work type, locations) from profile
    fetch('/api/profile').then(r => r.json()).then(p => {
      if (p) setProfilePrefs({
        workTypes: p.workTypes || [],
        locations: p.locations || [],
        openToRemote: p.openToRemote,
        preferOnsite: p.preferOnsite,
        platforms: p.platforms || [],
      })
    }).catch(() => {})
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
      <div style={{ padding: '8px 0 24px', color: 'var(--text-2)', fontSize: 13 }}>
        To update your profile or upload resumes, go to the <strong style={{ color: 'var(--text)' }}>Profile</strong> page.
      </div>

      {/* Connections */}
      <Section title="Connections">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: gmailStatus?.connected ? 0 : 12 }}>
              <span style={{ fontSize: 13, color: 'var(--text-2)', minWidth: 120 }}>Gmail</span>
              {gmailStatus?.connected
                ? <span style={{ color: 'var(--green)', fontSize: 13 }}>✓ Connected{gmailStatus.gmailEmail ? ` — ${gmailStatus.gmailEmail}` : ''}</span>
                : <><span style={{ color: 'var(--text-3)', fontSize: 13, marginRight: 10 }}>Not connected</span>
                    <a href="/auth/google/gmail" className="btn btn-ghost btn-sm">Connect Gmail →</a></>}
            </div>
            {!gmailStatus?.connected && (
              <div style={{ marginLeft: 132, fontSize: 13, color: 'var(--text-2)' }}>
                <strong style={{ color: 'var(--text)' }}>📬 What Gmail connection does:</strong>
                <ul style={{ marginTop: 8, paddingLeft: 18, lineHeight: 1.8 }}>
                  <li>Auto-detects recruiter replies — classifies as interview request, rejection, or follow-up</li>
                  <li>Updates your pipeline automatically when companies respond</li>
                  <li>Stops follow-up reminders when you already have a reply</li>
                </ul>
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-3)', padding: '8px 12px', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--green)' }}>
                  🔒 We only read emails from companies you've applied to. We never read personal emails or send anything without your approval.
                </div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text-2)', minWidth: 120 }}>Google Drive</span>
            {setupStatus?.checks?.driveConfigured
              ? <span style={{ color: 'var(--green)', fontSize: 13 }}>Connected — files sync to your Drive</span>
              : <span style={{ color: 'var(--yellow)', fontSize: 13 }}>Not connected — files stored on server only</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text-2)', minWidth: 120 }}>Google Sheets</span>
            <span style={{ color: 'var(--text-3)', fontSize: 13 }}>Not required — export as CSV instead</span>
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

        {/* Job Sources Explorer */}
        <div style={{ marginBottom: 20 }}>
          <label className="form-label">Job Sources</label>
          {sourcesData ? (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 16px' }}>
              {/* Header */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                  🌐 {sourcesData.active} active sources · {sourcesData.total} total available
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                  Searched automatically every morning based on your profile.
                </div>
              </div>

              {/* Groups */}
              {[
                { key: 'general', label: 'Always On' },
                { key: 'remote', label: 'Remote' },
                { key: 'canada', label: 'Canada' },
                { key: 'tech', label: 'Tech' },
                { key: 'startup', label: 'Startup' },
                { key: 'company_ats', label: 'Company ATS' },
              ].map(({ key, label }) => {
                const group = sourcesData.byCategory?.[key]
                if (!group || group.length === 0) return null
                return (
                  <div key={key} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', marginBottom: 6 }}>
                      {label}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {group.map(src => (
                        <div
                          key={src.id}
                          title={src.active ? src.description : src.inactiveReason || src.description}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '4px 10px',
                            border: `1px solid ${src.active ? 'var(--green)' : 'var(--border)'}`,
                            borderRadius: 20,
                            fontSize: 12, fontWeight: 500,
                            color: src.active ? 'var(--text)' : 'var(--text-3)',
                            opacity: src.active ? 1 : 0.55,
                            cursor: 'default',
                          }}
                        >
                          <span style={{ fontSize: 13 }}>{src.logoEmoji}</span>
                          {src.name}
                          {src.requiresKey && !src.active && (
                            <span style={{ fontSize: 10, color: 'var(--yellow)', marginLeft: 2 }}>🔑</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}

              {/* Footer */}
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-3)', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                <span>Want more sources? Add companies to watch below ↓</span>
                <a
                  href="https://www.linkedin.com/help/linkedin/answer/a567?src=or-search"
                  target="_blank" rel="noopener noreferrer"
                  style={{ color: 'var(--blue)', textDecoration: 'none', fontSize: 12 }}
                >
                  How to get your LinkedIn RSS feed →
                </a>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={testingsources}
                  onClick={async () => {
                    setTestingSources(true)
                    setSourceTestResult(null)
                    try {
                      const r = await fetch('/api/discover/test')
                      const d = await r.json()
                      setSourceTestResult(d.sources || [])
                    } catch { setSourceTestResult([]) }
                    finally { setTestingSources(false) }
                  }}
                >
                  {testingsources ? 'Testing…' : '🔌 Test Sources'}
                </button>
              </div>

              {/* Source test results */}
              {sourceTestResult && (
                <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--bg)', borderRadius: 6, fontSize: 12 }}>
                  {sourceTestResult.map(s => (
                    <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 14 }}>
                        {s.status === 'ok' ? '✅' : s.status === 'blocked' ? '🚫' : '❌'}
                      </span>
                      <span style={{ color: s.status === 'ok' ? 'var(--green)' : s.status === 'blocked' ? '#f59e0b' : 'var(--red)', fontWeight: 500 }}>
                        {s.name}
                      </span>
                      {s.status !== 'ok' && (
                        <span style={{ color: 'var(--text-3)' }}>
                          {s.status === 'blocked' ? '(blocked)' : '(error)'}
                        </span>
                      )}
                    </div>
                  ))}
                  {sourceTestResult.some(s => s.status === 'blocked') && (
                    <div style={{ marginTop: 8, color: 'var(--text-3)', fontStyle: 'italic' }}>
                      Some sources block cloud server IPs — this is normal.
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Loading sources...</div>
          )}
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

      {/* Your Job Preferences (read-only, sourced from Profile) */}
      {profilePrefs && (profilePrefs.locations?.length > 0 || profilePrefs.workTypes?.length > 0) && (
        <Section title="Your Job Preferences">
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 14 }}>
            Set during onboarding and editable on the <a href="#" onClick={e => { e.preventDefault(); window.dispatchEvent(new CustomEvent('navigate', { detail: 'profile' })) }} style={{ color: 'var(--blue, #3b82f6)', textDecoration: 'none' }}>Profile page</a>.
          </p>
          {profilePrefs.workTypes?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-3)', marginBottom: 8 }}>Work Type</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {profilePrefs.workTypes.map((t, i) => (
                  <span key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: '3px 12px', fontSize: 13, color: '#ccc' }}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </span>
                ))}
              </div>
            </div>
          )}
          {profilePrefs.locations?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-3)', marginBottom: 8 }}>Target Locations</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {profilePrefs.locations.map((loc, i) => (
                  <span key={i} style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 6, padding: '3px 10px', fontSize: 12, color: '#3b82f6' }}>
                    {loc}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {profilePrefs.openToRemote && <span style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 20, padding: '2px 10px', fontSize: 12, color: '#22c55e' }}>Remote ✓</span>}
            {profilePrefs.preferOnsite && <span style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 20, padding: '2px 10px', fontSize: 12, color: '#22c55e' }}>On-site/Hybrid ✓</span>}
          </div>
        </Section>
      )}

      {/* Export */}
      <Section title="Export">
        <button className="btn" onClick={() => { window.location.href = '/api/applications/export-csv' }}>
          Export All Applications as CSV
        </button>
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8, marginBottom: 0 }}>Opens in Excel, Google Sheets, or any spreadsheet app</p>
      </Section>

      {/* Delete Account — only visible to real OAuth users */}
      {user && user.id && user.id !== 'default' && (
        <Section title="Danger Zone">
          {deleteStep === 0 && (
            <div>
              <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 14 }}>
                Permanently deletes all your applications, profile, files, and preferences. This cannot be undone.
              </p>
              <button
                type="button"
                onClick={() => setDeleteStep(1)}
                style={{ background: 'none', border: '1px solid rgba(239,68,68,0.5)', color: 'var(--red, #ef4444)', borderRadius: 8, padding: '8px 18px', fontSize: 13, cursor: 'pointer' }}
              >
                Delete My Account
              </button>
            </div>
          )}

          {deleteStep === 1 && (
            <div>
              <p style={{ fontSize: 13, color: 'var(--red)', fontWeight: 600, marginBottom: 8 }}>
                This will permanently delete all your data. Type <strong>DELETE</strong> to confirm.
              </p>
              <input
                type="text"
                className="form-input"
                placeholder='Type DELETE to confirm'
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                style={{ maxWidth: 260, marginBottom: 12 }}
              />
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  disabled={deleteConfirmText !== 'DELETE' || deleteStep === 2}
                  onClick={async () => {
                    setDeleteStep(2)
                    try {
                      const r = await fetch('/api/account', { method: 'DELETE', credentials: 'include' })
                      if (r.ok) {
                        window.location.href = '/'
                      } else {
                        addToast('Failed to delete account.', 'error')
                        setDeleteStep(1)
                      }
                    } catch {
                      addToast('Network error.', 'error')
                      setDeleteStep(1)
                    }
                  }}
                  style={{ background: 'var(--red)', border: 'none', color: '#fff', borderRadius: 8, padding: '8px 18px', fontSize: 13, cursor: deleteConfirmText !== 'DELETE' ? 'not-allowed' : 'pointer', opacity: deleteConfirmText !== 'DELETE' ? 0.5 : 1 }}
                >
                  {deleteStep === 2 ? 'Deleting…' : 'Permanently Delete Account'}
                </button>
                <button
                  type="button"
                  onClick={() => { setDeleteStep(0); setDeleteConfirmText('') }}
                  style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-2)', borderRadius: 8, padding: '8px 18px', fontSize: 13, cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </Section>
      )}
      <div style={{ textAlign: 'center', padding: '24px 0 8px', fontSize: 12, color: 'var(--text-3)' }}>
        <a href="/privacy" style={{ color: 'var(--text-3)', textDecoration: 'none' }}>Privacy Policy</a>
        {' · '}
        <a href="/terms" style={{ color: 'var(--text-3)', textDecoration: 'none' }}>Terms of Service</a>
      </div>
    </div>
  )
}
