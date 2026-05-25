import { useState, useEffect, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

function SectionHeader({ title }) {
  return (
    <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, fontWeight: 600 }}>
      {title}
    </div>
  )
}

function Card({ children, style }) {
  return (
    <div className="card" style={{ marginBottom: 16, ...style }}>
      {children}
    </div>
  )
}

function TagInput({ tags, onAdd, onRemove, placeholder, inputId }) {
  const [input, setInput] = useState('')
  const add = () => {
    if (input.trim()) { onAdd(input.trim()); setInput('') }
  }
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {(tags || []).map((t, i) => (
          <span key={i} className="tag" style={{ cursor: 'pointer' }} onClick={() => onRemove(i)}>
            {t} <span style={{ opacity: 0.6 }}>×</span>
          </span>
        ))}
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
        <button className="btn btn-ghost btn-sm" onClick={add} type="button">Add</button>
      </div>
    </div>
  )
}

function ProgressBar({ value }) {
  const color = value >= 80 ? '#22c55e' : value >= 60 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{ background: '#1a1a1a', borderRadius: 4, height: 6, overflow: 'hidden' }}>
      <div style={{ width: `${value}%`, background: color, height: '100%', borderRadius: 4, transition: 'width 0.5s ease' }} />
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
    <div>
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
          {isDragActive ? 'Drop resumes here' : 'Upload Resumes'}
        </div>
        <div style={{ color: 'var(--text-3)', fontSize: 13 }}>PDF, DOCX, or TXT · Up to 6 files · Claude auto-fills your profile</div>
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
          <button className="btn" onClick={synthesize} disabled={uploading} style={{ width: '100%' }} type="button">
            {uploading
              ? <><span className="spinner" style={{ marginRight: 8 }} />Synthesizing with Claude...</>
              : `Build Profile from ${files.length} Resume${files.length > 1 ? 's' : ''}`}
          </button>
        </div>
      )}

      {synthesisNotes && (
        <div style={{ marginTop: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', fontSize: 13, color: 'var(--text-2)' }}>
          <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--green)' }}>Synthesis complete</div>
          {synthesisNotes}
        </div>
      )}
    </div>
  )
}

// ─── VIEW MODE SECTIONS ──────────────────────────────────────────────────────

function ViewProfile({ profile, resumeContent, showFullResume, setShowFullResume, onEdit }) {
  const completeness = profile.completeness || 0

  const initials = (profile.name || '?')
    .split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()

  return (
    <div style={{ padding: 32, maxWidth: 760 }}>
      {/* Header */}
      <div style={{ background: '#161616', border: '1px solid #242424', borderRadius: 12, padding: 24, display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 16, position: 'relative' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#1e3a5f', color: '#3b82f6', fontSize: 24, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#f0f0f0', marginBottom: 4 }}>{profile.name || 'Your Name'}</div>
          {profile.targetRoles?.length > 0 && (
            <div style={{ fontSize: 14, color: '#888', marginBottom: 6 }}>{profile.targetRoles.slice(0, 2).join(' · ')}</div>
          )}
          <div style={{ fontSize: 13, color: '#666', display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 10 }}>
            {profile.location && <span>{profile.location}</span>}
            {profile.email && <span>{profile.email}</span>}
            {profile.phone && <span>{profile.phone}</span>}
            {profile.website && <a href={profile.website} style={{ color: '#3b82f6', textDecoration: 'none' }} target="_blank" rel="noreferrer">{profile.website.replace(/^https?:\/\//, '')}</a>}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {profile.openToRemote && <span style={{ background: '#0f2a1a', border: '1px solid #1a4a2a', padding: '2px 9px', borderRadius: 20, fontSize: 11, color: '#4ade80' }}>Remote</span>}
            {profile.openToHybrid && <span style={{ background: '#0f2a1a', border: '1px solid #1a4a2a', padding: '2px 9px', borderRadius: 20, fontSize: 11, color: '#4ade80' }}>Hybrid</span>}
            {profile.openTo?.fullTime && <span style={{ background: '#0f0f0f', border: '1px solid #242424', padding: '2px 9px', borderRadius: 20, fontSize: 11, color: '#888' }}>Full-time</span>}
            {profile.openTo?.contract && <span style={{ background: '#0f0f0f', border: '1px solid #242424', padding: '2px 9px', borderRadius: 20, fontSize: 11, color: '#888' }}>Contract</span>}
            {profile.openTo?.partTime && <span style={{ background: '#0f0f0f', border: '1px solid #242424', padding: '2px 9px', borderRadius: 20, fontSize: 11, color: '#888' }}>Part-time</span>}
            {profile.openTo?.freelance && <span style={{ background: '#0f0f0f', border: '1px solid #242424', padding: '2px 9px', borderRadius: 20, fontSize: 11, color: '#888' }}>Freelance</span>}
          </div>
        </div>
        <button onClick={onEdit} style={{ position: 'absolute', top: 20, right: 20, background: 'transparent', border: '1px solid #333', color: '#999', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }} type="button">
          Edit Profile
        </button>
      </div>

      {/* Completeness */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <SectionHeader title="Profile Completeness" />
          <span style={{ fontSize: 14, fontWeight: 700, color: completeness >= 80 ? '#22c55e' : completeness >= 60 ? '#f59e0b' : '#ef4444' }}>{completeness}%</span>
        </div>
        <ProgressBar value={completeness} />
        {completeness < 60 && (
          <div style={{ fontSize: 12, color: '#f59e0b', marginTop: 8 }}>
            Complete at least 60% to enable job discovery. <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={onEdit}>Fill in the gaps</span>
          </div>
        )}
      </Card>

      {/* Summary */}
      {profile.summary && (
        <Card>
          <SectionHeader title="Summary" />
          <p style={{ fontSize: 14, color: '#ccc', lineHeight: 1.7, margin: 0 }}>{profile.summary}</p>
        </Card>
      )}

      {/* About */}
      {profile.about && (
        <Card>
          <SectionHeader title="About" />
          <p style={{ fontSize: 14, color: '#ccc', lineHeight: 1.7, margin: 0 }}>{profile.about}</p>
        </Card>
      )}

      {/* Experience */}
      {profile.experience?.length > 0 && (
        <Card>
          <SectionHeader title="Experience" />
          {profile.experience.map((exp, i) => (
            <div key={i} style={{ borderBottom: i < profile.experience.length - 1 ? '1px solid #1e1e1e' : 'none', paddingBottom: i < profile.experience.length - 1 ? 16 : 0, marginBottom: i < profile.experience.length - 1 ? 16 : 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#f0f0f0' }}>{exp.title} <span style={{ color: '#666', fontWeight: 400 }}>· {exp.company}</span></div>
              <div style={{ fontSize: 12, color: '#555', marginTop: 2, marginBottom: 8 }}>{exp.from}{exp.to ? ` – ${exp.to}` : ' – Present'}{exp.location ? ` · ${exp.location}` : ''}</div>
              {exp.description && <p style={{ fontSize: 13, color: '#aaa', margin: '0 0 8px' }}>{exp.description}</p>}
              {(exp.highlights || []).length > 0 && exp.highlights.map((h, j) => (
                <div key={j} style={{ fontSize: 13, color: '#888', paddingLeft: 14, marginBottom: 3 }}>• {h}</div>
              ))}
              {(exp.skills || []).length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                  {exp.skills.map((s, k) => (
                    <span key={k} style={{ background: '#111', border: '1px solid #222', padding: '2px 7px', borderRadius: 4, fontSize: 11, color: '#666' }}>{s}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </Card>
      )}

      {/* Core Skills */}
      {profile.coreSkills?.length > 0 && (
        <Card>
          <SectionHeader title="Core Skills" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {profile.coreSkills.map((s, i) => (
              <span key={i} style={{ background: '#0f0f0f', border: '1px solid #242424', padding: '4px 10px', borderRadius: 6, fontSize: 12, color: '#ccc' }}>{s}</span>
            ))}
          </div>
        </Card>
      )}

      {/* Education */}
      {profile.education?.length > 0 && (
        <Card>
          <SectionHeader title="Education" />
          {profile.education.map((e, i) => (
            <div key={i} style={{ marginBottom: i < profile.education.length - 1 ? 10 : 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#e0e0e0' }}>{e.degree}</div>
              <div style={{ fontSize: 13, color: '#888' }}>{e.institution}{e.year ? ` · ${e.year}` : ''}</div>
            </div>
          ))}
        </Card>
      )}

      {/* Certifications */}
      {profile.certifications?.length > 0 && (
        <Card>
          <SectionHeader title="Certifications" />
          {profile.certifications.map((c, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 14, color: '#e0e0e0' }}>{c.name || c}</div>
                {c.issuer && <div style={{ fontSize: 12, color: '#666' }}>{c.issuer}</div>}
              </div>
              {(c.year || c.expires) && <div style={{ fontSize: 12, color: '#555' }}>{c.year}{c.expires ? ` · Expires ${c.expires}` : ''}</div>}
            </div>
          ))}
        </Card>
      )}

      {/* Projects */}
      {profile.projects?.length > 0 && (
        <Card>
          <SectionHeader title="Projects" />
          {profile.projects.map((p, i) => (
            <div key={i} style={{ borderBottom: i < profile.projects.length - 1 ? '1px solid #1e1e1e' : 'none', paddingBottom: i < profile.projects.length - 1 ? 12 : 0, marginBottom: i < profile.projects.length - 1 ? 12 : 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#e0e0e0' }}>{p.name}</div>
                {p.url && <a href={p.url} style={{ fontSize: 12, color: '#3b82f6', textDecoration: 'none' }} target="_blank" rel="noreferrer">View</a>}
              </div>
              {p.description && <p style={{ fontSize: 13, color: '#aaa', margin: '4px 0 6px' }}>{p.description}</p>}
              {(p.techUsed || []).length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {p.techUsed.map((t, k) => (
                    <span key={k} style={{ background: '#111', border: '1px solid #222', padding: '2px 7px', borderRadius: 4, fontSize: 11, color: '#666' }}>{t}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </Card>
      )}

      {/* Achievements */}
      {profile.achievements?.length > 0 && (
        <Card>
          <SectionHeader title="Achievements" />
          {profile.achievements.map((a, i) => (
            <div key={i} style={{ fontSize: 13, color: '#aaa', marginBottom: 6, paddingLeft: 14 }}>• {a}</div>
          ))}
        </Card>
      )}

      {/* Languages */}
      {profile.languages?.length > 0 && (
        <Card>
          <SectionHeader title="Languages" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {profile.languages.map((l, i) => (
              <div key={i} style={{ background: '#111', border: '1px solid #222', padding: '6px 12px', borderRadius: 6, fontSize: 13, color: '#ccc' }}>
                {l.language || l} {l.level && <span style={{ color: '#555' }}>· {l.level}</span>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Volunteering */}
      {profile.volunteering?.length > 0 && (
        <Card>
          <SectionHeader title="Volunteering" />
          {profile.volunteering.map((v, i) => (
            <div key={i} style={{ marginBottom: i < profile.volunteering.length - 1 ? 10 : 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#e0e0e0' }}>{v.role} <span style={{ color: '#666', fontWeight: 400 }}>· {v.organization}</span></div>
              {(v.from || v.to) && <div style={{ fontSize: 12, color: '#555' }}>{v.from}{v.to ? ` – ${v.to}` : ''}</div>}
              {v.description && <p style={{ fontSize: 13, color: '#888', margin: '4px 0 0' }}>{v.description}</p>}
            </div>
          ))}
        </Card>
      )}

      {/* Base Resume */}
      <Card>
        <SectionHeader title="Base Resume" />
        <div style={{ fontSize: 12, color: '#555', marginBottom: 12 }}>Master document — a tailored version is generated per application</div>
        {resumeContent ? (
          <>
            <pre style={{ background: '#0a0a0a', border: '1px solid #1e1e1e', padding: 16, fontFamily: 'monospace', fontSize: 12, color: '#aaa', borderRadius: 8, maxHeight: showFullResume ? 'none' : 200, overflow: showFullResume ? 'auto' : 'hidden', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
              {resumeContent}
            </pre>
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => setShowFullResume(s => !s)}>
                {showFullResume ? 'Collapse' : 'View Full'}
              </button>
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => {
                const blob = new Blob([resumeContent], { type: 'text/markdown' })
                const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'base-resume.md'; a.click()
              }}>
                Download .md
              </button>
            </div>
          </>
        ) : (
          <p style={{ color: '#555', fontSize: 13, margin: 0 }}>No base resume yet — upload your resumes above to generate one.</p>
        )}
      </Card>
    </div>
  )
}

// ─── EDIT MODE ───────────────────────────────────────────────────────────────

function EditProfile({ form, setForm, onSave, saving, addToast, onBack }) {
  const patchArr = (field, idx, patch) => {
    setForm(f => {
      const arr = [...(f[field] || [])]
      arr[idx] = { ...arr[idx], ...patch }
      return { ...f, [field]: arr }
    })
  }
  const removeItem = (field, idx) => setForm(f => ({ ...f, [field]: (f[field] || []).filter((_, i) => i !== idx) }))
  const addItem = (field, item) => setForm(f => ({ ...f, [field]: [...(f[field] || []), item] }))

  return (
    <div style={{ padding: 32, maxWidth: 760 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <button type="button" onClick={onBack} style={{ background: 'transparent', border: 'none', color: '#999', cursor: 'pointer', fontSize: 22, padding: 0, lineHeight: 1 }}>←</button>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Edit Profile</h1>
        <button className="btn" style={{ marginLeft: 'auto' }} onClick={onSave} disabled={saving} type="button">
          {saving ? 'Saving...' : 'Save All Changes'}
        </button>
      </div>

      {/* Upload Resumes */}
      <div className="card" style={{ marginBottom: 16 }}>
        <SectionHeader title="Upload Resumes to Auto-fill" />
        <ResumeUploadZone addToast={addToast} onUploadComplete={synthesized => {
          if (synthesized) setForm(synthesized)
          else fetch('/api/profile').then(r => r.json()).then(p => setForm(p)).catch(() => {})
        }} />
      </div>

      {/* 1. Basic Info */}
      <div className="card" style={{ marginBottom: 16 }}>
        <SectionHeader title="1. Basic Information" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { key: 'name', label: 'Full Name', placeholder: 'Sai Pendyala' },
            { key: 'email', label: 'Email', placeholder: 'you@example.com' },
            { key: 'phone', label: 'Phone', placeholder: '+1 416 555 0100' },
            { key: 'location', label: 'Location', placeholder: 'Ajax, Ontario, Canada' },
            { key: 'website', label: 'Website / LinkedIn', placeholder: 'linkedin.com/in/yourname' },
            { key: 'yearsExperience', label: 'Years of Experience', placeholder: '10', type: 'number' },
          ].map(({ key, label, placeholder, type }) => (
            <div key={key} className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">{label}</label>
              <input
                type={type || 'text'}
                className="form-input"
                placeholder={placeholder}
                value={form[key] || ''}
                onChange={e => setForm(f => ({ ...f, [key]: type === 'number' ? (parseInt(e.target.value) || 0) : e.target.value }))}
              />
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14 }}>
          <label className="form-label">Min Salary Expectation</label>
          <input type="text" className="form-input" placeholder="$100,000 CAD / year" value={form.minSalary || ''} onChange={e => setForm(f => ({ ...f, minSalary: e.target.value }))} style={{ maxWidth: 280 }} />
        </div>
        <div style={{ marginTop: 14 }}>
          <label className="form-label">Open To</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 6 }}>
            {[
              { key: 'openToRemote', label: 'Remote', direct: true },
              { key: 'openToHybrid', label: 'Hybrid', direct: true },
              { key: 'fullTime', label: 'Full-time', nested: true },
              { key: 'contract', label: 'Contract', nested: true },
              { key: 'partTime', label: 'Part-time', nested: true },
              { key: 'freelance', label: 'Freelance', nested: true },
            ].map(({ key, label, direct, nested }) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 14 }}>
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
      </div>

      {/* 2. Summary */}
      <div className="card" style={{ marginBottom: 16 }}>
        <SectionHeader title="2. Professional Summary" />
        <textarea
          className="form-input"
          rows={4}
          placeholder="Experienced IT Operations professional with 10+ years leading incident management..."
          value={form.summary || ''}
          onChange={e => setForm(f => ({ ...f, summary: e.target.value }))}
          style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit' }}
        />
      </div>

      {/* 3. Core Skills */}
      <div className="card" style={{ marginBottom: 16 }}>
        <SectionHeader title="3. Core Skills" />
        <TagInput
          inputId="skills-input"
          tags={form.coreSkills || []}
          onAdd={s => setForm(f => ({ ...f, coreSkills: [...(f.coreSkills || []), s] }))}
          onRemove={i => setForm(f => ({ ...f, coreSkills: (f.coreSkills || []).filter((_, j) => j !== i) }))}
          placeholder="Incident Management, ITIL, Python..."
        />
      </div>

      {/* 4. Target Roles */}
      <div className="card" style={{ marginBottom: 16 }}>
        <SectionHeader title="4. Target Roles" />
        <TagInput
          inputId="roles-input"
          tags={form.targetRoles || []}
          onAdd={r => setForm(f => ({ ...f, targetRoles: [...(f.targetRoles || []), r] }))}
          onRemove={i => setForm(f => ({ ...f, targetRoles: (f.targetRoles || []).filter((_, j) => j !== i) }))}
          placeholder="IT Operations Manager, DevOps Lead..."
        />
      </div>

      {/* 5. Certifications */}
      <div className="card" style={{ marginBottom: 16 }}>
        <SectionHeader title="5. Certifications" />
        {(form.certifications || []).map((c, i) => (
          <div key={i} style={{ border: '1px solid #1e1e1e', borderRadius: 8, padding: 12, marginBottom: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Certification Name</label>
                <input className="form-input" value={c.name || ''} onChange={e => patchArr('certifications', i, { name: e.target.value })} placeholder="ITIL 4 Foundation" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Issuer</label>
                <input className="form-input" value={c.issuer || ''} onChange={e => patchArr('certifications', i, { issuer: e.target.value })} placeholder="PeopleCert" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Year</label>
                <input className="form-input" value={c.year || ''} onChange={e => patchArr('certifications', i, { year: e.target.value })} placeholder="2022" />
              </div>
            </div>
            <div style={{ marginTop: 8 }}>
              <label className="form-label">Expires (optional)</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input className="form-input" value={c.expires || ''} onChange={e => patchArr('certifications', i, { expires: e.target.value })} placeholder="2025 or Never" style={{ maxWidth: 160 }} />
                <button type="button" className="btn btn-ghost btn-sm" style={{ color: '#ef4444' }} onClick={() => removeItem('certifications', i)}>Remove</button>
              </div>
            </div>
          </div>
        ))}
        <button type="button" className="btn btn-ghost" onClick={() => addItem('certifications', { name: '', issuer: '', year: '', expires: '' })}>+ Add Certification</button>
      </div>

      {/* 6. Achievements */}
      <div className="card" style={{ marginBottom: 16 }}>
        <SectionHeader title="6. Achievements" />
        {(form.achievements || []).map((a, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              className="form-input"
              value={a}
              onChange={e => setForm(f => {
                const arr = [...(f.achievements || [])]
                arr[i] = e.target.value
                return { ...f, achievements: arr }
              })}
              placeholder="Reduced incident MTTR by 40% through automation..."
              style={{ flex: 1 }}
            />
            <button type="button" className="btn btn-ghost btn-sm" style={{ color: '#ef4444' }} onClick={() => removeItem('achievements', i)}>×</button>
          </div>
        ))}
        <button type="button" className="btn btn-ghost" onClick={() => addItem('achievements', '')}>+ Add Achievement</button>
      </div>

      {/* 7. Education */}
      <div className="card" style={{ marginBottom: 16 }}>
        <SectionHeader title="7. Education" />
        {(form.education || []).map((e, i) => (
          <div key={i} style={{ border: '1px solid #1e1e1e', borderRadius: 8, padding: 12, marginBottom: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Degree / Diploma</label>
                <input className="form-input" value={e.degree || ''} onChange={ev => patchArr('education', i, { degree: ev.target.value })} placeholder="B.Eng. Computer Science" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Institution</label>
                <input className="form-input" value={e.institution || ''} onChange={ev => patchArr('education', i, { institution: ev.target.value })} placeholder="University of Toronto" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Year</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input className="form-input" value={e.year || ''} onChange={ev => patchArr('education', i, { year: ev.target.value })} placeholder="2014" />
                  <button type="button" className="btn btn-ghost btn-sm" style={{ color: '#ef4444', flexShrink: 0 }} onClick={() => removeItem('education', i)}>×</button>
                </div>
              </div>
            </div>
          </div>
        ))}
        <button type="button" className="btn btn-ghost" onClick={() => addItem('education', { degree: '', institution: '', year: '' })}>+ Add Education</button>
      </div>

      {/* 8. Projects */}
      <div className="card" style={{ marginBottom: 16 }}>
        <SectionHeader title="8. Projects" />
        {(form.projects || []).map((p, i) => (
          <div key={i} style={{ border: '1px solid #1e1e1e', borderRadius: 8, padding: 12, marginBottom: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Project Name</label>
                <input className="form-input" value={p.name || ''} onChange={e => patchArr('projects', i, { name: e.target.value })} placeholder="Job AutoPilot" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">URL (optional)</label>
                <input className="form-input" value={p.url || ''} onChange={e => patchArr('projects', i, { url: e.target.value })} placeholder="https://github.com/..." />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 8 }}>
              <label className="form-label">Description</label>
              <textarea className="form-input" rows={2} value={p.description || ''} onChange={e => patchArr('projects', i, { description: e.target.value })} placeholder="AI-powered job search automation tool..." style={{ resize: 'vertical', fontFamily: 'inherit' }} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Technologies Used (comma-separated)</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input className="form-input" value={(p.techUsed || []).join(', ')} onChange={e => patchArr('projects', i, { techUsed: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })} placeholder="Node.js, React, SQLite" style={{ flex: 1 }} />
                <button type="button" className="btn btn-ghost btn-sm" style={{ color: '#ef4444', flexShrink: 0 }} onClick={() => removeItem('projects', i)}>Remove</button>
              </div>
            </div>
          </div>
        ))}
        <button type="button" className="btn btn-ghost" onClick={() => addItem('projects', { name: '', description: '', url: '', techUsed: [] })}>+ Add Project</button>
      </div>

      {/* 9. About */}
      <div className="card" style={{ marginBottom: 16 }}>
        <SectionHeader title="9. About" />
        <textarea
          className="form-input"
          rows={3}
          placeholder="A personal note about what drives you, values, or what you're looking for..."
          value={form.about || ''}
          onChange={e => setForm(f => ({ ...f, about: e.target.value }))}
          style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit' }}
        />
      </div>

      {/* 10. Experience */}
      <div className="card" style={{ marginBottom: 16 }}>
        <SectionHeader title="10. Experience" />
        {(form.experience || []).map((exp, i) => (
          <div key={i} style={{ border: '1px solid #1e1e1e', borderRadius: 8, padding: 16, marginBottom: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Job Title</label>
                <input className="form-input" value={exp.title || ''} onChange={e => patchArr('experience', i, { title: e.target.value })} placeholder="Senior IT Operations Manager" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Company</label>
                <input className="form-input" value={exp.company || ''} onChange={e => patchArr('experience', i, { company: e.target.value })} placeholder="Accenture" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">From</label>
                <input className="form-input" value={exp.from || ''} onChange={e => patchArr('experience', i, { from: e.target.value })} placeholder="Jan 2020" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">To</label>
                <input className="form-input" value={exp.to || ''} onChange={e => patchArr('experience', i, { to: e.target.value })} placeholder="Present" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Location</label>
                <input className="form-input" value={exp.location || ''} onChange={e => patchArr('experience', i, { location: e.target.value })} placeholder="Toronto, ON" />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 8 }}>
              <label className="form-label">Description (optional)</label>
              <textarea className="form-input" rows={2} value={exp.description || ''} onChange={e => patchArr('experience', i, { description: e.target.value })} placeholder="Led a team of..." style={{ resize: 'vertical', fontFamily: 'inherit' }} />
            </div>
            <div className="form-group" style={{ marginBottom: 8 }}>
              <label className="form-label">Key Highlights (one per line)</label>
              <textarea className="form-input" rows={3} value={(exp.highlights || []).join('\n')} onChange={e => patchArr('experience', i, { highlights: e.target.value.split('\n').filter(Boolean) })} placeholder="Reduced MTTR by 40%&#10;Led 8-person team..." style={{ resize: 'vertical', fontFamily: 'inherit' }} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Skills Used (comma-separated)</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input className="form-input" value={(exp.skills || []).join(', ')} onChange={e => patchArr('experience', i, { skills: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} placeholder="ITIL, ServiceNow, Python..." style={{ flex: 1 }} />
                <button type="button" className="btn btn-ghost btn-sm" style={{ color: '#ef4444', flexShrink: 0 }} onClick={() => removeItem('experience', i)}>Remove</button>
              </div>
            </div>
          </div>
        ))}
        <button type="button" className="btn btn-ghost" onClick={() => addItem('experience', { title: '', company: '', from: '', to: 'Present', location: '', description: '', highlights: [], skills: [] })}>+ Add Experience</button>
      </div>

      {/* 11. Languages */}
      <div className="card" style={{ marginBottom: 16 }}>
        <SectionHeader title="11. Languages" />
        {(form.languages || []).map((l, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <input
              className="form-input"
              value={l.language || l || ''}
              onChange={e => {
                const arr = [...(form.languages || [])]
                arr[i] = typeof l === 'object' ? { ...l, language: e.target.value } : { language: e.target.value, level: '' }
                setForm(f => ({ ...f, languages: arr }))
              }}
              placeholder="English"
              style={{ flex: 1 }}
            />
            <select
              className="form-input"
              value={l.level || ''}
              onChange={e => {
                const arr = [...(form.languages || [])]
                arr[i] = typeof l === 'object' ? { ...l, level: e.target.value } : { language: l, level: e.target.value }
                setForm(f => ({ ...f, languages: arr }))
              }}
              style={{ width: 140 }}
            >
              <option value="">— Level —</option>
              {['Native', 'Fluent', 'Professional', 'Conversational', 'Basic'].map(lvl => (
                <option key={lvl} value={lvl}>{lvl}</option>
              ))}
            </select>
            <button type="button" className="btn btn-ghost btn-sm" style={{ color: '#ef4444' }} onClick={() => removeItem('languages', i)}>×</button>
          </div>
        ))}
        <button type="button" className="btn btn-ghost" onClick={() => addItem('languages', { language: '', level: '' })}>+ Add Language</button>
      </div>

      {/* 12. Volunteering */}
      <div className="card" style={{ marginBottom: 16 }}>
        <SectionHeader title="12. Volunteering" />
        {(form.volunteering || []).map((v, i) => (
          <div key={i} style={{ border: '1px solid #1e1e1e', borderRadius: 8, padding: 12, marginBottom: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Role</label>
                <input className="form-input" value={v.role || ''} onChange={e => patchArr('volunteering', i, { role: e.target.value })} placeholder="Mentor" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Organization</label>
                <input className="form-input" value={v.organization || ''} onChange={e => patchArr('volunteering', i, { organization: e.target.value })} placeholder="Code for Canada" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">From</label>
                <input className="form-input" value={v.from || ''} onChange={e => patchArr('volunteering', i, { from: e.target.value })} placeholder="2021" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">To</label>
                <input className="form-input" value={v.to || ''} onChange={e => patchArr('volunteering', i, { to: e.target.value })} placeholder="Present" />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Description</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <textarea className="form-input" rows={2} value={v.description || ''} onChange={e => patchArr('volunteering', i, { description: e.target.value })} placeholder="Mentored junior developers..." style={{ flex: 1, resize: 'vertical', fontFamily: 'inherit' }} />
                <button type="button" className="btn btn-ghost btn-sm" style={{ color: '#ef4444', flexShrink: 0, marginTop: 4 }} onClick={() => removeItem('volunteering', i)}>Remove</button>
              </div>
            </div>
          </div>
        ))}
        <button type="button" className="btn btn-ghost" onClick={() => addItem('volunteering', { role: '', organization: '', from: '', to: '', description: '' })}>+ Add Volunteering</button>
      </div>

      {/* Save */}
      <div style={{ display: 'flex', gap: 12, paddingBottom: 32 }}>
        <button className="btn" onClick={onSave} disabled={saving} type="button" style={{ flex: 1 }}>
          {saving ? 'Saving...' : 'Save All Changes'}
        </button>
        <button className="btn btn-ghost" onClick={onBack} type="button">Cancel</button>
      </div>
    </div>
  )
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function Profile({ addToast }) {
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({})
  const [viewMode, setViewMode] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resumeContent, setResumeContent] = useState('')
  const [showFullResume, setShowFullResume] = useState(false)

  const loadProfile = () => {
    fetch('/api/profile').then(r => r.json()).then(p => { setProfile(p); setForm(p) }).catch(() => { setProfile({}); setForm({}) })
    fetch('/api/profile/resume').then(r => r.json()).then(d => setResumeContent(d.content || '')).catch(() => {})
  }

  useEffect(() => { loadProfile() }, [])

  const save = async () => {
    setSaving(true)
    try {
      await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      setProfile({ ...form })
      setViewMode(true)
      addToast('Profile saved!')
      loadProfile()
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
      <ViewProfile
        profile={profile}
        resumeContent={resumeContent}
        showFullResume={showFullResume}
        setShowFullResume={setShowFullResume}
        onEdit={() => { setForm({ ...profile }); setViewMode(false) }}
      />
    )
  }

  return (
    <EditProfile
      form={form}
      setForm={setForm}
      onSave={save}
      saving={saving}
      addToast={addToast}
      onBack={() => setViewMode(true)}
    />
  )
}
