import { useState, useRef, useEffect } from 'react'
import Spinner from './Spinner'
import { profileCompleteness } from '../lib/api'
import LocationPicker from './LocationPicker.jsx'

// ── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ step, total }) {
  const pct = Math.round((step / total) * 100)
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--border)' }}>
      <div style={{
        height: '100%', width: `${pct}%`, background: 'var(--green)',
        borderRadius: '0 2px 2px 0', transition: 'width 0.4s ease',
      }} />
    </div>
  )
}

// ── Toggle button ─────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, label }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 0' }}>
      <div onClick={() => onChange(!checked)} style={{
        width: 36, height: 20, borderRadius: 10, position: 'relative',
        background: checked ? 'var(--green)' : 'var(--border-hi)',
        transition: 'background 0.2s', flexShrink: 0, cursor: 'pointer',
      }}>
        <div style={{
          position: 'absolute', top: 2, left: checked ? 18 : 2,
          width: 16, height: 16, borderRadius: '50%', background: '#fff',
          transition: 'left 0.2s',
        }} />
      </div>
      <span style={{ fontSize: 13, color: 'var(--text)' }}>{label}</span>
    </label>
  )
}

// ── Step 0: Welcome ───────────────────────────────────────────────────────────
function StepWelcome({ onNext }) {
  const features = [
    { icon: '🔍', label: 'Finds matching jobs' },
    { icon: '✍️', label: 'Tailors every resume' },
    { icon: '📩', label: 'Monitors your inbox' },
  ]
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 52, marginBottom: 16 }}>🚀</div>
      <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 10 }}>Welcome to Job AutoPilot</h1>
      <p style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.7, marginBottom: 32, maxWidth: 400, margin: '0 auto 32px' }}>
        Your AI co-pilot for the job search. Let's set up your profile in about 3 minutes.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 28 }}>
        {features.map(f => (
          <div key={f.label} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: '16px 12px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{f.icon}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{f.label}</div>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 24 }}>
        Works with: LinkedIn · Indeed · Upwork · Fiverr · Freelancer · Remote OK
      </p>

      <button className="btn btn-primary btn-full btn-lg" onClick={onNext}>
        Get Started →
      </button>
      <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 10 }}>No credit card needed</p>
    </div>
  )
}

// ── Step 1: Upload Resumes ────────────────────────────────────────────────────
function StepUpload({ onNext, onManual, addToast }) {
  const [files, setFiles]         = useState([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const [linkedinOpen, setLinkedinOpen] = useState(false)
  const [dragging, setDragging]   = useState(false)
  const fileRef = useRef()

  const MAX_FILES = 6

  const addFiles = (incoming) => {
    const valid = Array.from(incoming).filter(f =>
      f.size <= 10 * 1024 * 1024 &&
      ['.pdf', '.docx', '.txt'].some(ext => f.name.toLowerCase().endsWith(ext))
    )
    setFiles(prev => {
      const slots = MAX_FILES - prev.length
      if (slots <= 0) return prev
      return [...prev, ...valid.slice(0, slots)]
    })
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    if (files.length >= MAX_FILES) return
    addFiles(e.dataTransfer.files)
  }

  const analyze = async () => {
    if (!files.length) return
    setLoading(true)
    setError(null)
    try {
      const fd = new FormData()
      files.forEach(f => fd.append('resumes', f))
      const res = await fetch('/api/profile/upload', {
        method: 'POST', credentials: 'include', body: fd,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      onNext(data.profile, data.baseResume)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Upload Your Resume</h2>
      <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
        Claude reads your resume and builds your complete candidate profile automatically.
      </p>

      {/* Drop zone */}
      {files.length >= MAX_FILES ? (
        <div style={{
          height: 80, border: '1px dashed var(--border)', borderRadius: 'var(--radius)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 16, background: 'var(--surface)',
        }}>
          <span style={{ fontSize: 13, color: 'var(--yellow)' }}>
            ⚠️ Maximum 6 files reached — remove a file below to add a different one
          </span>
        </div>
      ) : (
        <div
          onClick={() => !loading && fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); if (!loading) setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={loading ? e => e.preventDefault() : onDrop}
          style={{
            height: 140, border: `1px dashed ${loading ? 'var(--border)' : dragging ? 'var(--green)' : 'var(--border-hi)'}`,
            borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', cursor: loading ? 'default' : 'pointer',
            background: loading ? 'var(--surface)' : dragging ? 'rgba(34,197,94,0.04)' : 'transparent',
            transition: 'all 0.15s', marginBottom: 16,
          }}
        >
          {loading ? (
            <>
              <span className="spinner" style={{ width: 24, height: 24, borderWidth: 3, marginBottom: 10 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-2)', fontSize: 13, fontWeight: 500 }}>
                Processing your resume...
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>Claude is reading your resume (~20s)</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📁</div>
              <div style={{ fontSize: 14, color: 'var(--text-2)', fontWeight: 500 }}>Drop files here or click to browse</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
                PDF, DOCX, or TXT · {MAX_FILES - files.length} slot{MAX_FILES - files.length !== 1 ? 's' : ''} remaining · 10MB each
              </div>
            </>
          )}
        </div>
      )}
      <input ref={fileRef} type="file" multiple accept=".pdf,.docx,.txt"
             style={{ display: 'none' }} onChange={e => addFiles(e.target.files)} />

      {/* File list */}
      {files.length > 0 && (
        <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {files.map((f, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'var(--surface)', borderRadius: 'var(--radius-sm)',
              padding: '8px 12px', fontSize: 13,
            }}>
              <span>📄</span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
              <span style={{ color: 'var(--text-3)', fontSize: 11 }}>{(f.size / 1024).toFixed(0)} KB</span>
              <button onClick={(e) => { e.stopPropagation(); setFiles(prev => prev.filter((_, j) => j !== i)) }}
                      style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 2px', minHeight: 'unset' }}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* LinkedIn instructions */}
      <div style={{ marginBottom: 20 }}>
        <button onClick={() => setLinkedinOpen(o => !o)} style={{
          background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer',
          fontSize: 13, padding: 0, display: 'flex', alignItems: 'center', gap: 6, minHeight: 'unset',
        }}>
          🔗 How to download your LinkedIn profile as PDF {linkedinOpen ? '▲' : '▼'}
        </button>
        {linkedinOpen && (
          <div style={{
            marginTop: 10, padding: '12px 16px', background: 'var(--surface)',
            border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
            fontSize: 13, color: 'var(--text-2)', lineHeight: 1.8,
          }}>
            1. Go to your LinkedIn profile<br />
            2. Click "More" (below your name)<br />
            3. Select "Save to PDF"<br />
            4. Upload that file above
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 'var(--radius-sm)',
          color: 'var(--red)', fontSize: 13, padding: '10px 14px', marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      <button className="btn btn-primary btn-full" onClick={analyze}
              disabled={files.length === 0 || loading}>
        {loading ? <><Spinner size={14} color="#000" /> Analyzing with Claude... (20–30 seconds)</> : 'Analyze & Build Profile →'}
      </button>

      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <button type="button" onClick={onManual} style={{
          background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer',
          fontSize: 13, textDecoration: 'underline', padding: 0,
        }}>
          No resume? Build your profile manually →
        </button>
      </div>
      <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'var(--text-3)' }}>
        By continuing you agree to our{' '}
        <a href="/privacy" target="_blank" rel="noreferrer" style={{ color: 'var(--text-3)' }}>Privacy Policy</a>
      </p>
    </div>
  )
}

// ── Step 2: Review Profile ────────────────────────────────────────────────────
function StepReview({ profile, baseResume, onApprove, onBack }) {
  const [loading, setLoading] = useState(false)
  const score = profileCompleteness(profile)
  const barColor = score >= 80 ? 'var(--green)' : score >= 60 ? 'var(--yellow)' : 'var(--red)'

  const approve = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/profile/approve', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, baseResume }),
      })
      if (!res.ok) throw new Error('Approval failed')
      onApprove()
    } catch {
      // silently proceed — profile saved locally enough to continue
      onApprove()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Here's what we found</h2>
      <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 20 }}>
        Check this over — you can edit everything later in Profile.
      </p>

      {/* Completeness bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, color: 'var(--text-2)' }}>
          <span>Profile completeness</span>
          <span style={{ fontWeight: 700, color: barColor }}>{score}%</span>
        </div>
        <div style={{ height: 6, background: 'var(--border)', borderRadius: 3 }}>
          <div style={{ height: '100%', width: `${score}%`, background: barColor, borderRadius: 3, transition: 'width 0.5s' }} />
        </div>
      </div>

      {/* Profile card */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: 18, marginBottom: 20,
        maxHeight: 320, overflowY: 'auto',
      }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{profile?.name || '—'}</div>
        <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16 }}>
          {[profile?.location, profile?.email, profile?.phone].filter(Boolean).join(' · ')}
        </div>

        {profile?.targetRoles?.length > 0 && (
          <Section label="Target Roles">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {profile.targetRoles.slice(0, 6).map((r, i) => (
                <span key={i} className="tag-chip">{r}</span>
              ))}
              {profile.targetRoles.length > 6 && <span className="tag-chip">+{profile.targetRoles.length - 6} more</span>}
            </div>
          </Section>
        )}

        {profile?.experience?.length > 0 && (
          <Section label="Experience">
            {profile.experience.slice(0, 3).map((e, i) => (
              <div key={i} style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 4 }}>
                {e.title} — {e.company} · {e.from}{e.to ? `–${e.to}` : ''}
              </div>
            ))}
            {profile.experience.length > 3 && (
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>+{profile.experience.length - 3} more</div>
            )}
          </Section>
        )}

        {profile?.coreSkills?.length > 0 && (
          <Section label="Core Skills">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {profile.coreSkills.slice(0, 14).map((s, i) => (
                <span key={i} className="tag-chip">{s}</span>
              ))}
              {profile.coreSkills.length > 14 && <span className="tag-chip">+{profile.coreSkills.length - 14} more</span>}
            </div>
          </Section>
        )}

        {profile?.education?.length > 0 && (
          <Section label="Education">
            {profile.education.slice(0, 2).map((e, i) => (
              <div key={i} style={{ fontSize: 13, color: 'var(--text-2)' }}>
                {e.degree} — {e.institution}{e.year ? ` · ${e.year}` : ''}
              </div>
            ))}
          </Section>
        )}
      </div>

      <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 16, textAlign: 'center' }}>
        You can edit all details on the Profile page anytime
      </p>

      <div style={{ display: 'flex', gap: 12 }}>
        <button className="btn btn-secondary" onClick={onBack} style={{ flex: 1 }}>← Re-upload</button>
        <button className="btn btn-primary" onClick={approve} disabled={loading} style={{ flex: 2 }}>
          {loading ? <><Spinner size={14} color="#000" /> Saving...</> : 'Looks Good — Continue →'}
        </button>
      </div>
    </div>
  )
}

function Section({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 6 }}>
        {label}
      </div>
      {children}
    </div>
  )
}

// ── Step 3: What are you looking for ─────────────────────────────────────────
function StepPreferences({ onNext }) {
  const [workTypes, setWorkTypes] = useState({ fulltime: true, contract: true, parttime: false, internship: false })
  const [platforms, setPlatforms] = useState({
    indeed: true, linkedin: true, monster: true,
    remoteok: true, weworkremotely: true, remotive: true,
    upwork: true, fiverr: true, freelancer: true, peopleperhour: true,
  })
  const [remote, setRemote]         = useState(true)
  const [onsite, setOnsite]         = useState(false)
  const [locations, setLocations]   = useState(['remote'])
  const [loading, setLoading]       = useState(false)

  const toggle = (obj, setObj, key) => setObj(o => ({ ...o, [key]: !o[key] }))

  const save = async () => {
    setLoading(true)
    try {
      await fetch('/api/profile', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workTypes: Object.keys(workTypes).filter(k => workTypes[k]),
          platforms: Object.keys(platforms).filter(k => platforms[k]),
          openToRemote: remote, preferOnsite: onsite,
          locations,
        }),
      })
      // fire discovery in background, don't wait
      fetch('/api/discover', { method: 'POST', credentials: 'include' }).catch(() => {})
    } catch {}
    setLoading(false)
    onNext()
  }

  const CheckRow = ({ label, checked, onChange }) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', cursor: 'pointer', fontSize: 13 }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
             style={{ width: 15, height: 15, accentColor: 'var(--green)', cursor: 'pointer' }} />
      <span>{label}</span>
    </label>
  )

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>What kind of work are you after?</h2>
      <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 24 }}>
        This helps us search the right platforms for you.
      </p>

      {/* Work type */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>
          Work Type
        </div>
        <CheckRow label="Full-time employment" checked={workTypes.fulltime} onChange={v => toggle(workTypes, setWorkTypes, 'fulltime')} />
        <CheckRow label="Contract / freelance projects" checked={workTypes.contract} onChange={v => toggle(workTypes, setWorkTypes, 'contract')} />
        <CheckRow label="Part-time" checked={workTypes.parttime} onChange={v => toggle(workTypes, setWorkTypes, 'parttime')} />
        <CheckRow label="Internship" checked={workTypes.internship} onChange={v => toggle(workTypes, setWorkTypes, 'internship')} />
      </div>

      {/* Platforms */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>
          Salaried Job Boards
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          {[['indeed','Indeed'],['linkedin','LinkedIn'],['monster','Monster'],['remoteok','Remote OK'],['weworkremotely','We Work Remotely'],['remotive','Remotive']].map(([k,l]) => (
            <CheckRow key={k} label={l} checked={platforms[k]} onChange={() => toggle(platforms, setPlatforms, k)} />
          ))}
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-3)', margin: '14px 0 8px' }}>
          Freelance Platforms
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          {[['upwork','Upwork'],['fiverr','Fiverr'],['freelancer','Freelancer.com'],['peopleperhour','PeoplePerHour']].map(([k,l]) => (
            <CheckRow key={k} label={l} checked={platforms[k]} onChange={() => toggle(platforms, setPlatforms, k)} />
          ))}
        </div>
      </div>

      {/* Location */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>
          Location
        </div>
        <CheckRow label="Open to remote" checked={remote} onChange={setRemote} />
        <CheckRow label="Open to on-site / hybrid" checked={onsite} onChange={setOnsite} />

        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 8 }}>
            Target locations — pick up to 5
          </div>
          <LocationPicker value={locations} onChange={setLocations} />
        </div>
      </div>

      <button className="btn btn-primary btn-full btn-lg" onClick={save} disabled={loading}>
        {loading ? <><Spinner size={14} color="#000" /> Saving...</> : 'Save & Find My First Jobs →'}
      </button>
    </div>
  )
}

// ── Step 4: Done ──────────────────────────────────────────────────────────────
function StepDone({ onComplete }) {
  const [ready, setReady] = useState(false)
  const [seconds, setSeconds] = useState(60)

  useEffect(() => {
    fetch('/api/discover', { method: 'POST', credentials: 'include' }).catch(() => {})
    const done = setTimeout(() => setReady(true), 60000)
    const tick = setInterval(() => setSeconds(s => Math.max(0, s - 1)), 1000)
    return () => { clearTimeout(done); clearInterval(tick) }
  }, [])

  const messages = [
    seconds > 45 ? 'Checking Indeed and RemoteOK...' :
    seconds > 30 ? 'Filtering jobs against your profile...' :
    seconds > 15 ? 'Scoring top matches with AI...' :
    'Almost done — preparing your queue...'
  ]

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 52, marginBottom: 16 }}>🎉</div>
      <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>You're all set!</h2>

      {!ready ? (
        <div style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 32, lineHeight: 1.7 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
            <Spinner size={16} />
            <span>{messages[0]}</span>
          </div>
          {/* Sources preview */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8 }}>
              Checking 20+ sources including:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
              {['🔍 Indeed', '🏡 We Work Remotely', '🏔 Himalayas', '🌍 Remotive', '🍁 Job Bank Canada'].map(name => (
                <span key={name} style={{
                  display: 'inline-block', padding: '3px 10px',
                  border: '1px solid var(--border)', borderRadius: 20,
                  fontSize: 12, color: 'var(--text-3)',
                }}>{name}</span>
              ))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8 }}>
              + 15 more sources based on your profile
            </div>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 16px', display: 'inline-block', fontSize: 13 }}>
            <span style={{ color: 'var(--text-3)' }}>~</span>
            <span style={{ color: 'var(--green)', fontWeight: 700, marginLeft: 4 }}>{seconds}s</span>
            <span style={{ color: 'var(--text-3)', marginLeft: 4 }}>remaining</span>
          </div>
        </div>
      ) : (
        <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 32 }}>
          Your first job matches are ready.
        </p>
      )}

      <button className="btn btn-primary btn-full btn-lg" onClick={onComplete} disabled={!ready} style={{ opacity: ready ? 1 : 0.5 }}>
        {ready ? 'Go to Dashboard →' : 'Please wait...'}
      </button>
      <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 12 }}>
        Discovery runs automatically every morning at 8am
      </p>
    </div>
  )
}

// ── Step 1b: Manual Profile Builder ──────────────────────────────────────────
function StepManual({ onNext, onBack }) {
  const empty = {
    name: '', email: '', phone: '', location: '', linkedin: '', website: '',
    summary: '', about: '',
    targetRoles: [], coreSkills: [],
    experience: [{ title: '', company: '', from: '', to: '', description: '' }],
    education: [{ degree: '', institution: '', year: '' }],
    certifications: [],
    achievements: [],
    projects: [],
    languages: [],
    volunteering: [],
  }
  const [form, setForm] = useState(empty)
  const [tagInput, setTagInput] = useState({ targetRoles: '', coreSkills: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }))

  const addTag = (field) => {
    const v = tagInput[field].trim()
    if (!v) return
    setForm(f => ({ ...f, [field]: [...(f[field] || []), v] }))
    setTagInput(t => ({ ...t, [field]: '' }))
  }
  const removeTag = (field, i) => setForm(f => ({ ...f, [field]: f[field].filter((_, j) => j !== i) }))

  const addRow = (field, blank) => setForm(f => ({ ...f, [field]: [...(f[field] || []), blank] }))
  const removeRow = (field, i) => setForm(f => ({ ...f, [field]: f[field].filter((_, j) => j !== i) }))
  const patchRow = (field, i, patch) => setForm(f => {
    const arr = [...(f[field] || [])]
    arr[i] = { ...arr[i], ...patch }
    return { ...f, [field]: arr }
  })

  const inp = { className: 'form-input', style: { fontSize: 13, marginBottom: 0 } }
  const label = (txt) => (
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 6, marginTop: 18 }}>
      {txt}
    </div>
  )
  const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }

  const submit = async () => {
    if (!form.name.trim()) { setError('Name is required.'); return }
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/profile/approve', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: form, baseResume: '' }),
      })
      if (!res.ok) throw new Error('Failed to save profile')
      onNext(form, '')
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Build your profile manually</h2>
      <p style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 20 }}>
        Fill in what you know — you can edit everything later on the Profile page.
      </p>

      <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: 4 }}>

        {/* 1. Basic info */}
        {label('1. Basic Info')}
        <div style={grid2}>
          <input {...inp} placeholder="Full name *" value={form.name} onChange={e => set('name', e.target.value)} />
          <input {...inp} placeholder="Email" value={form.email} onChange={e => set('email', e.target.value)} />
          <input {...inp} placeholder="Phone" value={form.phone} onChange={e => set('phone', e.target.value)} />
          <input {...inp} placeholder="Location (e.g. Toronto, ON)" value={form.location} onChange={e => set('location', e.target.value)} />
          <input {...inp} placeholder="LinkedIn URL" value={form.linkedin} onChange={e => set('linkedin', e.target.value)} />
          <input {...inp} placeholder="Website / portfolio" value={form.website} onChange={e => set('website', e.target.value)} />
        </div>

        {/* 2. Summary */}
        {label('2. Summary')}
        <textarea {...inp} rows={3} placeholder="2–3 sentence professional summary..." value={form.summary}
          onChange={e => set('summary', e.target.value)}
          style={{ ...inp.style, width: '100%', resize: 'vertical', fontFamily: 'inherit' }} />

        {/* 3. Target Roles */}
        {label('3. Target Roles')}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
          {form.targetRoles.map((r, i) => (
            <span key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-2)', fontSize: 12, padding: '2px 8px', cursor: 'pointer' }}
              onClick={() => removeTag('targetRoles', i)}>{r} ×</span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input {...inp} placeholder="e.g. Product Manager" value={tagInput.targetRoles}
            onChange={e => setTagInput(t => ({ ...t, targetRoles: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag('targetRoles'))}
            style={{ ...inp.style, flex: 1 }} />
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => addTag('targetRoles')}>Add</button>
        </div>

        {/* 4. Core Skills */}
        {label('4. Core Skills')}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
          {form.coreSkills.map((s, i) => (
            <span key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-2)', fontSize: 12, padding: '2px 8px', cursor: 'pointer' }}
              onClick={() => removeTag('coreSkills', i)}>{s} ×</span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input {...inp} placeholder="e.g. SQL, Python, React..." value={tagInput.coreSkills}
            onChange={e => setTagInput(t => ({ ...t, coreSkills: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag('coreSkills'))}
            style={{ ...inp.style, flex: 1 }} />
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => addTag('coreSkills')}>Add</button>
        </div>

        {/* 5. Experience */}
        {label('5. Experience')}
        {form.experience.map((exp, i) => (
          <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginBottom: 8 }}>
            <div style={grid2}>
              <input {...inp} placeholder="Job title" value={exp.title} onChange={e => patchRow('experience', i, { title: e.target.value })} />
              <input {...inp} placeholder="Company" value={exp.company} onChange={e => patchRow('experience', i, { company: e.target.value })} />
              <input {...inp} placeholder="From (e.g. 2020)" value={exp.from} onChange={e => patchRow('experience', i, { from: e.target.value })} />
              <input {...inp} placeholder="To (or Present)" value={exp.to} onChange={e => patchRow('experience', i, { to: e.target.value })} />
            </div>
            <textarea {...inp} rows={2} placeholder="What you did (bullet points or sentences)..." value={exp.description}
              onChange={e => patchRow('experience', i, { description: e.target.value })}
              style={{ ...inp.style, width: '100%', resize: 'vertical', fontFamily: 'inherit', marginTop: 8 }} />
            {form.experience.length > 1 && (
              <button type="button" onClick={() => removeRow('experience', i)}
                style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 12, padding: '4px 0', marginTop: 4 }}>
                Remove
              </button>
            )}
          </div>
        ))}
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => addRow('experience', { title: '', company: '', from: '', to: '', description: '' })}>
          + Add Role
        </button>

        {/* 6. Education */}
        {label('6. Education')}
        {form.education.map((ed, i) => (
          <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginBottom: 8 }}>
            <div style={grid2}>
              <input {...inp} placeholder="Degree (e.g. B.Sc. Computer Science)" value={ed.degree} onChange={e => patchRow('education', i, { degree: e.target.value })} />
              <input {...inp} placeholder="Institution" value={ed.institution} onChange={e => patchRow('education', i, { institution: e.target.value })} />
              <input {...inp} placeholder="Year (e.g. 2018)" value={ed.year} onChange={e => patchRow('education', i, { year: e.target.value })} />
            </div>
            {form.education.length > 1 && (
              <button type="button" onClick={() => removeRow('education', i)}
                style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 12, padding: '4px 0', marginTop: 4 }}>
                Remove
              </button>
            )}
          </div>
        ))}
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => addRow('education', { degree: '', institution: '', year: '' })}>
          + Add Education
        </button>

        {/* 7. Certifications */}
        {label('7. Certifications')}
        {form.certifications.map((c, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
            <input {...inp} placeholder="Certification name" value={c.name || ''} onChange={e => patchRow('certifications', i, { name: e.target.value })} style={{ ...inp.style, flex: 2 }} />
            <input {...inp} placeholder="Issuer" value={c.issuer || ''} onChange={e => patchRow('certifications', i, { issuer: e.target.value })} style={{ ...inp.style, flex: 1 }} />
            <input {...inp} placeholder="Year" value={c.year || ''} onChange={e => patchRow('certifications', i, { year: e.target.value })} style={{ ...inp.style, width: 70 }} />
            <button type="button" onClick={() => removeRow('certifications', i)}
              style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}>×</button>
          </div>
        ))}
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => addRow('certifications', { name: '', issuer: '', year: '' })}>
          + Add Certification
        </button>

        {/* 8. Achievements */}
        {label('8. Achievements')}
        {form.achievements.map((a, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            <input {...inp} placeholder="e.g. Led team that shipped product used by 50k users" value={a} onChange={e => {
              const arr = [...form.achievements]; arr[i] = e.target.value; set('achievements', arr)
            }} style={{ ...inp.style, flex: 1 }} />
            <button type="button" onClick={() => removeRow('achievements', i)}
              style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}>×</button>
          </div>
        ))}
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm(f => ({ ...f, achievements: [...f.achievements, ''] }))}>
          + Add Achievement
        </button>

        {/* 9. Projects */}
        {label('9. Projects')}
        {form.projects.map((p, i) => (
          <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginBottom: 8 }}>
            <div style={grid2}>
              <input {...inp} placeholder="Project name" value={p.name || ''} onChange={e => patchRow('projects', i, { name: e.target.value })} />
              <input {...inp} placeholder="URL (optional)" value={p.url || ''} onChange={e => patchRow('projects', i, { url: e.target.value })} />
            </div>
            <input {...inp} placeholder="Tech used (e.g. React, Node, Postgres)" value={p.techUsed || ''} onChange={e => patchRow('projects', i, { techUsed: e.target.value })} style={{ ...inp.style, width: '100%', marginTop: 8 }} />
            <textarea {...inp} rows={2} placeholder="What it does and your role..." value={p.description || ''}
              onChange={e => patchRow('projects', i, { description: e.target.value })}
              style={{ ...inp.style, width: '100%', resize: 'vertical', fontFamily: 'inherit', marginTop: 8 }} />
            <button type="button" onClick={() => removeRow('projects', i)}
              style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 12, padding: '4px 0', marginTop: 4 }}>
              Remove
            </button>
          </div>
        ))}
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => addRow('projects', { name: '', description: '', url: '', techUsed: '' })}>
          + Add Project
        </button>

        {/* 10. About */}
        {label('10. About (optional — different from summary)')}
        <textarea {...inp} rows={2} placeholder="More informal bio, background context, what drives you..." value={form.about}
          onChange={e => set('about', e.target.value)}
          style={{ ...inp.style, width: '100%', resize: 'vertical', fontFamily: 'inherit' }} />

        {/* 11. Languages */}
        {label('11. Languages')}
        {form.languages.map((l, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
            <input {...inp} placeholder="Language" value={l.language || ''} onChange={e => patchRow('languages', i, { language: e.target.value })} style={{ ...inp.style, flex: 1 }} />
            <select {...inp} value={l.level || ''} onChange={e => patchRow('languages', i, { level: e.target.value })} style={{ ...inp.style, width: 140 }}>
              <option value="">— Level —</option>
              {['Native', 'Fluent', 'Professional', 'Conversational', 'Basic'].map(lv => <option key={lv} value={lv}>{lv}</option>)}
            </select>
            <button type="button" onClick={() => removeRow('languages', i)}
              style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}>×</button>
          </div>
        ))}
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => addRow('languages', { language: '', level: '' })}>
          + Add Language
        </button>

        {/* 12. Volunteering */}
        {label('12. Volunteering')}
        {form.volunteering.map((v, i) => (
          <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginBottom: 8 }}>
            <div style={grid2}>
              <input {...inp} placeholder="Role" value={v.role || ''} onChange={e => patchRow('volunteering', i, { role: e.target.value })} />
              <input {...inp} placeholder="Organization" value={v.organization || ''} onChange={e => patchRow('volunteering', i, { organization: e.target.value })} />
              <input {...inp} placeholder="From" value={v.from || ''} onChange={e => patchRow('volunteering', i, { from: e.target.value })} />
              <input {...inp} placeholder="To" value={v.to || ''} onChange={e => patchRow('volunteering', i, { to: e.target.value })} />
            </div>
            <textarea {...inp} rows={2} placeholder="What you did..." value={v.description || ''}
              onChange={e => patchRow('volunteering', i, { description: e.target.value })}
              style={{ ...inp.style, width: '100%', resize: 'vertical', fontFamily: 'inherit', marginTop: 8 }} />
            <button type="button" onClick={() => removeRow('volunteering', i)}
              style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 12, padding: '4px 0', marginTop: 4 }}>
              Remove
            </button>
          </div>
        ))}
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => addRow('volunteering', { role: '', organization: '', from: '', to: '', description: '' })}>
          + Add Volunteering
        </button>

        <div style={{ height: 8 }} />
      </div>

      {error && (
        <div style={{ background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 'var(--radius-sm)', color: 'var(--red)', fontSize: 13, padding: '10px 14px', marginTop: 12 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button className="btn btn-secondary" onClick={onBack} style={{ flex: 1 }}>← Back</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving} style={{ flex: 2 }}>
          {saving ? <><Spinner size={14} color="#000" /> Saving...</> : 'Save & Continue →'}
        </button>
      </div>
    </div>
  )
}

// ── Main Onboarding component ─────────────────────────────────────────────────
export default function Onboarding({ onComplete, addToast }) {
  const [step, setStep]         = useState(0)
  const [profile, setProfile]   = useState(null)
  const [baseResume, setBase]   = useState('')
  const [manualMode, setManualMode] = useState(false)
  const TOTAL = 4

  const handleUploadDone = (p, br) => { setProfile(p); setBase(br); setStep(2) }
  const handleManualDone = (p, br) => { setProfile(p); setBase(br); setStep(3) }
  const handleApproveDone = () => setStep(3)
  const handlePreferencesDone = () => setStep(4)

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(8,8,8,0.97)',
      zIndex: 1000, display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: 16, overflowY: 'auto',
    }}>
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', maxWidth: 560, width: '100%',
        padding: 40, position: 'relative', marginTop: 'auto', marginBottom: 'auto',
      }}>
        <ProgressBar step={step + 1} total={TOTAL + 1} />

        {step === 0 && <StepWelcome onNext={() => setStep(1)} />}
        {step === 1 && !manualMode && <StepUpload onNext={handleUploadDone} onManual={() => setManualMode(true)} addToast={addToast} />}
        {step === 1 && manualMode && <StepManual onNext={handleManualDone} onBack={() => setManualMode(false)} />}
        {step === 2 && <StepReview profile={profile} baseResume={baseResume} onApprove={handleApproveDone} onBack={() => setStep(1)} />}
        {step === 3 && <StepPreferences onNext={handlePreferencesDone} />}
        {step === 4 && <StepDone onComplete={onComplete} />}
      </div>
    </div>
  )
}
