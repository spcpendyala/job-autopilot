import { useState, useEffect, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

function Section({ title, children }) {
  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-2)', borderBottom: '1px solid var(--border)', marginBottom: 20, paddingBottom: 12 }}>{title}</h2>
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
          <span key={i} className="tag" style={{ cursor: 'pointer' }} onClick={() => onRemove(i)}>
            {t} <span style={{ opacity: 0.6 }}>×</span>
          </span>
        ))}
        <span className="tag" style={{ background: 'transparent', border: '1px dashed var(--border-hi)', color: 'var(--text-3)', cursor: 'pointer' }} onClick={() => document.getElementById('tag-add-input')?.focus()}>
          + Add
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          id="tag-add-input"
          className="form-input"
          placeholder={placeholder}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          style={{ fontSize: 13 }}
        />
        <button className="btn btn-ghost btn-sm" onClick={add}>Add</button>
      </div>
    </div>
  )
}

function ResumeUploadZone({ onUploadComplete, addToast }) {
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [synthesisNotes, setSynthesisNotes] = useState('')

  const onDrop = useCallback(accepted => {
    const merged = [...files, ...accepted].slice(0, 6)
    setFiles(merged)
  }, [files])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'], 'text/plain': ['.txt'] },
    maxFiles: 6,
    multiple: true,
  })

  const synthesize = async () => {
    if (files.length === 0) { addToast('Add at least one resume file.', 'error'); return }
    setUploading(true)
    setSynthesisNotes('')
    try {
      const fd = new FormData()
      files.forEach(f => fd.append('resumes', f))
      const r = await fetch('/api/profile/upload', { method: 'POST', body: fd })
      const d = await r.json()
      if (d.error) throw new Error(d.error)
      setSynthesisNotes(d.synthesisNotes || '')
      addToast('Profile synthesized from your resumes!', 'success')
      setFiles([])
      onUploadComplete && onUploadComplete(d.profile)
    } catch (err) {
      addToast(err.message || 'Upload failed.', 'error')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <div {...getRootProps()} className="dropzone" style={{ borderColor: isDragActive ? 'var(--blue)' : undefined, background: isDragActive ? 'var(--blue-dim)' : undefined }}>
        <input {...getInputProps()} />
        <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>
          {isDragActive ? 'Drop resumes here' : 'Upload Resumes to Improve Profile'}
        </div>
        <div style={{ color: 'var(--text-3)', fontSize: 13 }}>Drop PDF, DOCX, or TXT · Up to 6 · AI synthesizes automatically</div>
      </div>

      {files.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {files.map((f, i) => (
              <span key={i} className="tag" style={{ cursor: 'pointer' }} onClick={() => setFiles(fs => fs.filter((_, j) => j !== i))}>
                {f.name} ×
              </span>
            ))}
          </div>
          <button className="btn" onClick={synthesize} disabled={uploading} style={{ width: '100%' }}>
            {uploading ? <><span className="spinner" style={{ marginRight: 8 }} />Synthesizing with Claude...</> : `Synthesize Profile from ${files.length} Resume${files.length > 1 ? 's' : ''}`}
          </button>
        </div>
      )}

      {synthesisNotes && (
        <div style={{ marginTop: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', fontSize: 13, color: 'var(--text-2)' }}>
          <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--green)' }}>✓ Synthesis complete</div>
          {synthesisNotes}
        </div>
      )}
    </div>
  )
}

export default function Settings({ addToast }) {
  const [profile, setProfile] = useState(null)
  const [config, setConfig] = useState(null)
  const [profileForm, setProfileForm] = useState({})
  const [discovering, setDiscovering] = useState(false)
  const [discoverResult, setDiscoverResult] = useState(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPrefs, setSavingPrefs] = useState(false)

  useEffect(() => {
    fetch('/api/profile').then(r => r.json()).then(p => { setProfile(p); setProfileForm(p) }).catch(() => setProfile({}))
    fetch('/api/config').then(r => r.json()).then(setConfig).catch(() => setConfig({}))
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

  const saveProfile = async () => {
    setSavingProfile(true)
    try {
      await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm),
      })
      setProfile(profileForm)
      addToast('Profile saved!', 'success')
    } catch { addToast('Failed to save profile.', 'error') }
    finally { setSavingProfile(false) }
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

  if (!profile || !config) return (
    <div style={{ padding: 32, textAlign: 'center', paddingTop: 80 }}>
      <span className="spinner" />
    </div>
  )

  return (
    <div style={{ padding: 32, maxWidth: 720 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Settings</h1>

      {/* Section 1 — Your Profile */}
      <Section title="Your Profile">
        <ResumeUploadZone
          addToast={addToast}
          onUploadComplete={synthesized => {
            if (synthesized) {
              setProfile(synthesized)
              setProfileForm(synthesized)
            } else {
              fetch('/api/profile').then(r => r.json()).then(p => { setProfile(p); setProfileForm(p) }).catch(() => {})
            }
          }}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          {[
            { key: 'name', label: 'Name', placeholder: 'Sai Pendyala' },
            { key: 'yearsExperience', label: 'Years Exp', placeholder: '10', type: 'number' },
            { key: 'location', label: 'Location', placeholder: 'Ajax, Ontario' },
            { key: 'email', label: 'Email', placeholder: 'you@example.com' },
          ].map(({ key, label, placeholder, type }) => (
            <div key={key} className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">{label}</label>
              <input
                type={type || 'text'}
                className="form-input"
                placeholder={placeholder}
                value={profileForm[key] || ''}
                onChange={e => setProfileForm(f => ({ ...f, [key]: type === 'number' ? (parseInt(e.target.value) || 0) : e.target.value }))}
              />
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label className="form-label">Target Roles <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(click to remove)</span></label>
          <TagInput
            tags={profileForm.targetRoles || []}
            onAdd={r => setProfileForm(f => ({ ...f, targetRoles: [...(f.targetRoles || []), r] }))}
            onRemove={i => setProfileForm(f => ({ ...f, targetRoles: (f.targetRoles || []).filter((_, j) => j !== i) }))}
            placeholder="Operations Manager..."
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label className="form-label">Open to</label>
          <div style={{ display: 'flex', gap: 16 }}>
            {[
              { key: 'openToRemote', label: 'Remote' },
              { key: 'openToHybrid', label: 'Hybrid' },
            ].map(({ key, label }) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                <input
                  type="checkbox"
                  checked={!!profileForm[key]}
                  onChange={e => setProfileForm(f => ({ ...f, [key]: e.target.checked }))}
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label className="form-label">Core Skills <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(click to remove)</span></label>
          <TagInput
            tags={profileForm.coreSkills || []}
            onAdd={s => setProfileForm(f => ({ ...f, coreSkills: [...(f.coreSkills || []), s] }))}
            onRemove={i => setProfileForm(f => ({ ...f, coreSkills: (f.coreSkills || []).filter((_, j) => j !== i) }))}
            placeholder="Incident Management, ITIL..."
          />
        </div>

        <button className="btn" onClick={saveProfile} disabled={savingProfile}>
          {savingProfile ? 'Saving...' : 'Save Profile Changes'}
        </button>
      </Section>

      {/* Section 2 — Discovery */}
      <Section title="Discovery">
        <div style={{ marginBottom: 20 }}>
          <label className="form-label">What I'm looking for</label>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {['Full-time', 'Contract', 'Remote', 'Freelance'].map(type => {
              const key = type.toLowerCase().replace('-', '')
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
          {config.lastMorningBriefAt && (
            <span style={{ color: 'var(--text-3)', fontSize: 13 }}>
              Last run: {new Date(config.lastMorningBriefAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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

      {/* Section 3 — AI Engine */}
      <Section title="AI Engine">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
          <span style={{ color: 'var(--green)', fontWeight: 600 }}>Connected</span>
          <span style={{ color: 'var(--text-3)', fontSize: 13 }}>
            · {config.betaMode ? 'Beta Mode — Haiku (faster, cheaper)' : 'Production Mode — Sonnet (smarter)'}
          </span>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14 }}>
          <input
            type="checkbox"
            checked={config.betaMode || false}
            onChange={e => patchConfig({ betaMode: e.target.checked })}
          />
          Beta Mode (Haiku) — reduces API costs by ~10x
        </label>
      </Section>

      {/* Section 4 — Powered By */}
      <Section title="Powered By">
        <div style={{ marginBottom: 20 }}>
          <div style={{ color: 'var(--text-3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Job Discovery</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {['Indeed', 'Remote OK', 'We Work Remotely', 'Remotive'].map(s => (
              <span key={s} className="tag" style={{ background: 'var(--surface)', color: 'var(--text-2)' }}>{s}</span>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          <div>
            <div style={{ color: 'var(--text-3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Salary Intel</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {['Glassdoor', 'Levels.fyi'].map(s => (
                <span key={s} className="tag" style={{ background: 'var(--surface)', color: 'var(--text-2)' }}>{s}</span>
              ))}
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--text-3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Company Research</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {['Crunchbase', 'News API'].map(s => (
                <span key={s} className="tag" style={{ background: 'var(--surface)', color: 'var(--text-2)' }}>{s}</span>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div style={{ color: 'var(--text-3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>AI Engine</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="tag" style={{ background: 'rgba(168,85,247,0.15)', color: 'var(--purple)' }}>Anthropic Claude</span>
            <span style={{ color: 'var(--text-3)', fontSize: 13 }}>Sonnet 4 + Haiku 4.5</span>
          </div>
        </div>
      </Section>
    </div>
  )
}
