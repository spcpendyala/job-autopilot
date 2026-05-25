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

function TagInput({ tags, onAdd, onRemove, placeholder, inputId }) {
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
        <span className="tag" style={{ background: 'transparent', border: '1px dashed var(--border-hi)', color: 'var(--text-3)', cursor: 'pointer' }} onClick={() => document.getElementById(inputId)?.focus()}>
          + Add
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          id={inputId}
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
    setFiles(prev => [...prev, ...accepted].slice(0, 6))
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
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
      <div
        {...getRootProps()}
        className="dropzone"
        style={{
          borderColor: isDragActive ? 'var(--blue)' : undefined,
          background: isDragActive ? 'var(--blue-dim)' : undefined,
        }}
      >
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
            {uploading
              ? <><span className="spinner" style={{ marginRight: 8 }} />Synthesizing with Claude...</>
              : `Synthesize Profile from ${files.length} Resume${files.length > 1 ? 's' : ''}`}
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

export default function Profile({ addToast }) {
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({})
  const [viewMode, setViewMode] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resumeContent, setResumeContent] = useState('')
  const [showFullResume, setShowFullResume] = useState(false)

  useEffect(() => {
    fetch('/api/profile').then(r => r.json()).then(p => { setProfile(p); setForm(p) }).catch(() => { setProfile({}); setForm({}) })
    fetch('/api/profile/resume').then(r => r.json()).then(d => setResumeContent(d.content || '')).catch(() => {})
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      setProfile(form)
      setViewMode(true)
      addToast('Profile saved!')
    } catch {
      addToast('Failed to save profile.', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!profile) return (
    <div style={{ padding: 32, textAlign: 'center', paddingTop: 80 }}>
      <span className="spinner" />
    </div>
  )

  if (viewMode) {
    return (
      <div style={{ padding: 32, maxWidth: 720 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Your Profile</h1>

        {/* Header card */}
        <div style={{ background: '#161616', border: '1px solid #242424', borderRadius: 12, padding: 24, display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 16, position: 'relative' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#1e3a5f', color: '#3b82f6', fontSize: 24, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {(profile.name || '?').split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#f0f0f0', marginBottom: 4 }}>{profile.name || 'Your Name'}</div>
            <div style={{ fontSize: 13, color: '#999', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {profile.location && <span>{profile.location}</span>}
              {profile.email && <span>{profile.email}</span>}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              {profile.yearsExperience > 0 && <span style={{ background: '#0f0f0f', border: '1px solid #242424', padding: '3px 10px', borderRadius: 20, fontSize: 12, color: '#888' }}>{profile.yearsExperience} yrs exp</span>}
              {profile.openToRemote && <span style={{ background: '#0f0f0f', border: '1px solid #242424', padding: '3px 10px', borderRadius: 20, fontSize: 12, color: '#888' }}>Remote</span>}
              {profile.openToHybrid && <span style={{ background: '#0f0f0f', border: '1px solid #242424', padding: '3px 10px', borderRadius: 20, fontSize: 12, color: '#888' }}>Hybrid</span>}
              {profile.openTo?.fullTime && <span style={{ background: '#0f0f0f', border: '1px solid #242424', padding: '3px 10px', borderRadius: 20, fontSize: 12, color: '#888' }}>Full-time</span>}
              {profile.openTo?.contract && <span style={{ background: '#0f0f0f', border: '1px solid #242424', padding: '3px 10px', borderRadius: 20, fontSize: 12, color: '#888' }}>Contract</span>}
              {profile.openTo?.partTime && <span style={{ background: '#0f0f0f', border: '1px solid #242424', padding: '3px 10px', borderRadius: 20, fontSize: 12, color: '#888' }}>Part-time</span>}
              {profile.openTo?.freelance && <span style={{ background: '#0f0f0f', border: '1px solid #242424', padding: '3px 10px', borderRadius: 20, fontSize: 12, color: '#888' }}>Freelance</span>}
              {profile.minSalary && <span style={{ background: '#0f0f0f', border: '1px solid #242424', padding: '3px 10px', borderRadius: 20, fontSize: 12, color: '#555' }}>{profile.minSalary}</span>}
            </div>
          </div>
          <button onClick={() => setViewMode(false)} style={{ position: 'absolute', top: 24, right: 24, background: 'transparent', border: '1px solid #333', color: '#999', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Edit Profile</button>
        </div>

        {/* Summary */}
        {profile.summary && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Summary</div>
            <p style={{ fontSize: 14, color: '#ccc', lineHeight: 1.7, margin: 0 }}>{profile.summary}</p>
          </div>
        )}

        {/* Experience */}
        {profile.experience?.length > 0 && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Experience</div>
            {profile.experience.map((exp, i) => (
              <div key={i} style={{ borderBottom: i < profile.experience.length - 1 ? '1px solid #1e1e1e' : 'none', paddingBottom: i < profile.experience.length - 1 ? 16 : 0, marginBottom: i < profile.experience.length - 1 ? 16 : 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#f0f0f0' }}>{exp.title} <span style={{ color: '#999', fontWeight: 400 }}>· {exp.company}</span></div>
                <div style={{ fontSize: 12, color: '#555', marginTop: 2, marginBottom: 8 }}>{exp.from} – {exp.to}</div>
                {(exp.highlights || []).map((h, j) => (
                  <div key={j} style={{ fontSize: 13, color: '#aaa', paddingLeft: 16, marginBottom: 4 }}>• {h}</div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Core Skills */}
        {profile.coreSkills?.length > 0 && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Core Skills</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {profile.coreSkills.map((s, i) => (
                <span key={i} style={{ background: '#0f0f0f', border: '1px solid #242424', padding: '4px 10px', borderRadius: 6, fontSize: 12, color: '#ccc' }}>{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* Education */}
        {profile.education?.length > 0 && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Education</div>
            {profile.education.map((e, i) => (
              <div key={i} style={{ fontSize: 13, color: '#ccc', marginBottom: 6 }}>{e.degree} <span style={{ color: '#999' }}>· {e.institution}</span></div>
            ))}
          </div>
        )}

        {/* Base Resume */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Base Resume</div>
          <div style={{ fontSize: 12, color: '#555', marginBottom: 12 }}>Your master document — a tailored version is generated per application</div>
          {resumeContent ? (
            <>
              <pre style={{ background: '#0a0a0a', border: '1px solid #1e1e1e', padding: 16, fontFamily: 'monospace', fontSize: 12, color: '#aaa', borderRadius: 8, maxHeight: showFullResume ? 'none' : 200, overflow: showFullResume ? 'auto' : 'hidden', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
                {resumeContent}
              </pre>
              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowFullResume(s => !s)}>
                  {showFullResume ? 'Collapse' : 'View Full Resume'}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => {
                  const blob = new Blob([resumeContent], { type: 'text/markdown' })
                  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'base-resume.md'; a.click()
                }}>
                  Download .md
                </button>
              </div>
            </>
          ) : (
            <p style={{ color: '#555', fontSize: 13, margin: 0 }}>No resume yet — upload your resumes to generate one.</p>
          )}
        </div>
      </div>
    )
  }

  // Edit mode
  return (
    <div style={{ padding: 32, maxWidth: 720 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => setViewMode(true)} style={{ background: 'transparent', border: 'none', color: '#999', cursor: 'pointer', fontSize: 20, padding: 0 }}>←</button>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Edit Profile</h1>
      </div>

      {/* Upload Resumes section */}
      <Section title="Upload Resumes">
        <ResumeUploadZone addToast={addToast} onUploadComplete={synthesized => {
          if (synthesized) { setProfile(synthesized); setForm(synthesized) }
          else { fetch('/api/profile').then(r => r.json()).then(p => { setProfile(p); setForm(p) }).catch(() => {}) }
        }} />
      </Section>

      {/* Profile form */}
      <Section title="Current Profile">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          {[
            { key: 'name', label: 'Name', placeholder: 'Sai Pendyala' },
            { key: 'yearsExperience', label: 'Years Exp', placeholder: '10', type: 'number' },
            { key: 'location', label: 'Location', placeholder: 'Ajax, Ontario' },
            { key: 'email', label: 'Email', placeholder: 'you@example.com' },
            { key: 'minSalary', label: 'Min Salary', placeholder: '$80,000 CAD' },
          ].map(({ key, label, placeholder, type }) => (
            <div key={key} className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">{label}</label>
              <input type={type || 'text'} className="form-input" placeholder={placeholder}
                value={form[key] || ''}
                onChange={e => setForm(f => ({ ...f, [key]: type === 'number' ? (parseInt(e.target.value) || 0) : e.target.value }))} />
            </div>
          ))}
        </div>
        <div style={{ marginBottom: 16 }}>
          <label className="form-label">Target Roles <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(click to remove)</span></label>
          <TagInput inputId="profile-roles-input" tags={form.targetRoles || []}
            onAdd={r => setForm(f => ({ ...f, targetRoles: [...(f.targetRoles || []), r] }))}
            onRemove={i => setForm(f => ({ ...f, targetRoles: (f.targetRoles || []).filter((_, j) => j !== i) }))}
            placeholder="Operations Manager..." />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label className="form-label">Open to</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {[
              { key: 'openToRemote', label: 'Remote', direct: true },
              { key: 'openToHybrid', label: 'Hybrid', direct: true },
              { key: 'fullTime', label: 'Full-time', nested: true },
              { key: 'contract', label: 'Contract', nested: true },
              { key: 'partTime', label: 'Part-time', nested: true },
              { key: 'freelance', label: 'Freelance', nested: true },
            ].map(({ key, label, direct, nested }) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                <input type="checkbox"
                  checked={direct ? !!form[key] : !!(form.openTo?.[key])}
                  onChange={e => {
                    if (direct) setForm(f => ({ ...f, [key]: e.target.checked }))
                    else setForm(f => ({ ...f, openTo: { ...(f.openTo || {}), [key]: e.target.checked } }))
                  }} />
                {label}
              </label>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label className="form-label">Core Skills <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(click to remove)</span></label>
          <TagInput inputId="profile-skills-input" tags={form.coreSkills || []}
            onAdd={s => setForm(f => ({ ...f, coreSkills: [...(f.coreSkills || []), s] }))}
            onRemove={i => setForm(f => ({ ...f, coreSkills: (f.coreSkills || []).filter((_, j) => j !== i) }))}
            placeholder="Incident Management, ITIL..." />
        </div>
        <button className="btn" onClick={save} disabled={saving}>
          {saving ? 'Saving...' : 'Save Profile Changes'}
        </button>
      </Section>
    </div>
  )
}
