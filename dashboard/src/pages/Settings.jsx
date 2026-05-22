import { useState, useEffect } from 'react'

function Section({ title, children }) {
  return (
    <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: 24, marginBottom: 20 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, borderBottom: '1px solid #2a2a2a', marginBottom: 20, paddingBottom: 12 }}>{title}</h2>
      {children}
    </div>
  )
}

function TagInput({ tags, onAdd, onRemove, placeholder }) {
  const [input, setInput] = useState('')
  const add = () => { if (input.trim()) { onAdd(input.trim()); setInput('') } }
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {(tags || []).map((t, i) => (
          <span key={i} style={{ background: '#2a2a2a', borderRadius: 6, color: '#d0d0d0', display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, padding: '3px 8px' }}>
            {t}
            <button onClick={() => onRemove(i)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: 0 }}>×</button>
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input className="form-input" placeholder={placeholder} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
        <button className="btn btn-ghost btn-sm" onClick={add}>Add</button>
      </div>
    </div>
  )
}

function ListInput({ items, onAdd, onRemove, placeholder, hint }) {
  const [input, setInput] = useState('')
  const add = () => { if (input.trim()) { onAdd(input.trim()); setInput('') } }
  return (
    <div>
      {items.length === 0 && (
        <div style={{ color: '#444', fontSize: 13, padding: '10px 14px', background: '#111', borderRadius: 8, border: '1px dashed #2a2a2a', marginBottom: 12 }}>
          No items added yet. Add one below.
        </div>
      )}
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid #2a2a2a' }}>
          <span style={{ color: '#d0d0d0', fontSize: 13, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item}</span>
          <button onClick={() => onRemove(i)} style={{ background: 'none', border: '1px solid #2a2a2a', borderRadius: 4, color: '#888', cursor: 'pointer', fontSize: 12, padding: '2px 8px', flexShrink: 0 }}>Remove</button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input className="form-input" placeholder={placeholder} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
        <button className="btn btn-ghost btn-sm" onClick={add} style={{ whiteSpace: 'nowrap' }}>Add</button>
      </div>
      {hint && <div style={{ color: '#555', fontSize: 12, marginTop: 6 }}>{hint}</div>}
    </div>
  )
}

export default function Settings({ addToast }) {
  const [profile, setProfile] = useState(null)
  const [config, setConfig] = useState(null)
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({})
  const [discovering, setDiscovering] = useState(false)
  const [discoverResult, setDiscoverResult] = useState(null)
  const [savingPrefs, setSavingPrefs] = useState(false)

  useEffect(() => {
    fetch('/api/profile').then(r => r.json()).then(p => { setProfile(p); setProfileForm(p) }).catch(() => setProfile({}))
    fetch('/api/config').then(r => r.json()).then(setConfig).catch(() => setConfig({}))
  }, [])

  const saveProfile = async () => {
    try {
      await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm),
      })
      setProfile(profileForm)
      setEditingProfile(false)
      addToast('Profile saved!', 'success')
    } catch { addToast('Failed to save profile.', 'error') }
  }

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
      setDiscoverResult(d.discovered || [])
      addToast(`Found ${(d.discovered || []).length} jobs.`, 'success')
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

  if (!profile || !config) return (
    <div style={{ padding: 32, textAlign: 'center', paddingTop: 80 }}>
      <span className="spinner" />
    </div>
  )

  return (
    <div style={{ padding: 32, maxWidth: 720 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Settings</h1>

      {/* Section 1 — Profile */}
      <Section title="Your Profile">
        {!editingProfile ? (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              {[
                { label: 'Name', value: profile.name },
                { label: 'Email', value: profile.email },
                { label: 'Phone', value: profile.phone },
                { label: 'Experience', value: profile.yearsExperience != null ? `${profile.yearsExperience} years` : null },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ color: '#555', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>{label}</div>
                  <div style={{ color: value ? '#f0f0f0' : '#444' }}>{value || '—'}</div>
                </div>
              ))}
            </div>
            {(profile.targetRoles || []).length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ color: '#555', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Target Roles</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {profile.targetRoles.map((r, i) => (
                    <span key={i} style={{ background: '#2a2a2a', borderRadius: 6, color: '#d0d0d0', fontSize: 12, padding: '3px 8px' }}>{r}</span>
                  ))}
                </div>
              </div>
            )}
            <button className="btn btn-ghost" onClick={() => setEditingProfile(true)}>Edit Profile</button>
          </div>
        ) : (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              {[
                { key: 'name', label: 'Name', type: 'text', placeholder: 'Sai Pendyala' },
                { key: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com' },
                { key: 'phone', label: 'Phone', type: 'text', placeholder: '+1 555 000 0000' },
                { key: 'linkedIn', label: 'LinkedIn URL', type: 'text', placeholder: 'linkedin.com/in/...' },
                { key: 'yearsExperience', label: 'Years Experience', type: 'number', placeholder: '5' },
              ].map(({ key, label, type, placeholder }) => (
                <div key={key} className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{label}</label>
                  <input
                    type={type}
                    className="form-input"
                    placeholder={placeholder}
                    value={profileForm[key] || ''}
                    onChange={e => setProfileForm(f => ({ ...f, [key]: type === 'number' ? (parseInt(e.target.value) || 0) : e.target.value }))}
                  />
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label className="form-label">Target Roles</label>
              <TagInput
                tags={profileForm.targetRoles || []}
                onAdd={r => setProfileForm(f => ({ ...f, targetRoles: [...(f.targetRoles || []), r] }))}
                onRemove={i => setProfileForm(f => ({ ...f, targetRoles: f.targetRoles.filter((_, j) => j !== i) }))}
                placeholder="Operations Manager..."
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label className="form-label">Core Skills</label>
              <TagInput
                tags={profileForm.coreSkills || []}
                onAdd={s => setProfileForm(f => ({ ...f, coreSkills: [...(f.coreSkills || []), s] }))}
                onRemove={i => setProfileForm(f => ({ ...f, coreSkills: f.coreSkills.filter((_, j) => j !== i) }))}
                placeholder="Python, SQL, Project Management..."
              />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-ghost" onClick={() => { setEditingProfile(false); setProfileForm(profile) }}>Cancel</button>
              <button className="btn" onClick={saveProfile}>Save Profile</button>
            </div>
          </div>
        )}
      </Section>

      {/* Section 2 — Discovery */}
      <Section title="Discovery">
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>RSS Feeds</div>
          <div style={{ color: '#555', fontSize: 13, marginBottom: 14 }}>
            Job alerts from Indeed, LinkedIn, and other job boards.
          </div>
          <ListInput
            items={config.rssFeeds || []}
            onAdd={url => patchConfig({ rssFeeds: [...(config.rssFeeds || []), url] })}
            onRemove={i => patchConfig({ rssFeeds: (config.rssFeeds || []).filter((_, j) => j !== i) })}
            placeholder="https://www.indeed.com/rss?q=operations+manager&l=Toronto"
            hint="Get LinkedIn RSS: LinkedIn → Jobs → Job Alerts → ··· → Get RSS link"
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Watched Companies</div>
          <div style={{ color: '#555', fontSize: 13, marginBottom: 14 }}>
            Career pages to monitor for new openings.
          </div>
          <ListInput
            items={config.watchedCompanies || []}
            onAdd={url => patchConfig({ watchedCompanies: [...(config.watchedCompanies || []), url] })}
            onRemove={i => patchConfig({ watchedCompanies: (config.watchedCompanies || []).filter((_, j) => j !== i) })}
            placeholder="https://boards.greenhouse.io/shopify"
            hint="Works with Greenhouse, Lever, and most company career pages"
          />
        </div>

        <div>
          <button className="btn" onClick={runDiscover} disabled={discovering}>
            {discovering ? <><span className="spinner" style={{ marginRight: 8 }} />Running...</> : '🔍 Run Discovery Now'}
          </button>
          {discoverResult && (
            <div style={{ marginTop: 12, background: '#111', border: '1px solid #2a2a2a', borderRadius: 8, padding: 14, fontSize: 13, color: '#888' }}>
              {discoverResult.length > 0
                ? `Found ${discoverResult.length} job(s) in your pipeline. Check Pipeline for details.`
                : 'No new jobs discovered. Try adding more sources.'}
            </div>
          )}
        </div>
      </Section>

      {/* Section 3 — Connections */}
      <Section title="Connections">
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Google Account</div>
          <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 8, padding: 14, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#555', flexShrink: 0 }} />
            <span style={{ color: '#888', fontSize: 13 }}>Not connected — run setup-google.js to connect</span>
          </div>
          <div style={{ color: '#555', fontSize: 13 }}>
            In your terminal: <code style={{ background: '#1a1a1a', borderRadius: 4, fontSize: 12, padding: '2px 6px' }}>node scripts/setup-google.js</code>
          </div>
        </div>

        <div>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Anthropic API</div>
          <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 8, padding: 14, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
            <span style={{ color: '#22c55e', fontSize: 13, fontWeight: 500 }}>Connected</span>
            <span style={{ color: '#555', fontSize: 12 }}>
              · {config.betaMode ? 'Beta Mode — Haiku (faster, cheaper)' : 'Production Mode — Sonnet (smarter)'}
            </span>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', color: '#888', fontSize: 13 }}>
            <input
              type="checkbox"
              checked={config.betaMode || false}
              onChange={e => patchConfig({ betaMode: e.target.checked })}
            />
            Use Beta Mode (Haiku) — reduces API costs by ~10x
          </label>
        </div>
      </Section>

      {/* Section 4 — Preferences */}
      <Section title="Preferences">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Follow-up reminder (days)</label>
            <input
              type="number"
              className="form-input"
              min={1} max={30}
              value={config.followUpDays || 5}
              onChange={e => setConfig(c => ({ ...c, followUpDays: parseInt(e.target.value) || 5 }))}
            />
            <div style={{ color: '#555', fontSize: 12, marginTop: 4 }}>Show follow-up after this many days without a response</div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Daily scan time</label>
            <input
              type="time"
              className="form-input"
              value={config.dailyScanTime || '08:00'}
              onChange={e => setConfig(c => ({ ...c, dailyScanTime: e.target.value }))}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
            <label className="form-label">Minimum fit score to show ({config.minScoreToShow || 6}/10)</label>
            <input
              type="range"
              min={1} max={10}
              value={config.minScoreToShow || 6}
              onChange={e => setConfig(c => ({ ...c, minScoreToShow: parseInt(e.target.value) }))}
              style={{ width: '100%', accentColor: '#22c55e' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555', fontSize: 11 }}>
              <span>1 — Show everything</span>
              <span>10 — Only perfect fits</span>
            </div>
          </div>
        </div>

        <button className="btn" onClick={savePreferences} disabled={savingPrefs}>
          {savingPrefs ? 'Saving...' : 'Save Preferences'}
        </button>
      </Section>
    </div>
  )
}
