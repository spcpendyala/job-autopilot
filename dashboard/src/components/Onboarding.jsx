import { useState, useEffect } from 'react'

function StepBar({ total, current }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 36 }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < current ? '#22c55e' : '#2a2a2a', transition: 'background 0.3s' }} />
      ))}
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
            <button onClick={() => onRemove(i)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input className="form-input" placeholder={placeholder} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
        <button className="btn btn-ghost" onClick={add}>Add</button>
      </div>
    </div>
  )
}

export default function Onboarding({ setupStatus, onComplete, addToast }) {
  const [step, setStep] = useState(1)
  const [profile, setProfile] = useState(null)
  const [editing, setEditing] = useState(false)
  const [profileForm, setProfileForm] = useState({})
  const [rssInput, setRssInput] = useState('')
  const [companyInput, setCompanyInput] = useState('')
  const [sources, setSources] = useState([])

  useEffect(() => {
    fetch('/api/profile').then(r => r.json()).then(p => { setProfile(p); setProfileForm(p) }).catch(() => {})
  }, [])

  const saveProfile = async () => {
    try {
      await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm),
      })
      setProfile(profileForm)
      setEditing(false)
      addToast('Profile saved!', 'success')
    } catch { addToast('Failed to save profile.', 'error') }
  }

  const finish = async () => {
    if (sources.length > 0) {
      const rssFeeds = sources.filter(s => s.type === 'rss').map(s => s.value)
      const watchedCompanies = sources.filter(s => s.type === 'company').map(s => s.value)
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rssFeeds, watchedCompanies }),
      }).catch(() => {})
    }
    onComplete()
  }

  const addSource = (type, value) => {
    if (!value.trim()) return
    setSources(s => [...s, { type, value: value.trim() }])
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, overflowY: 'auto' }}>
      <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 16, maxWidth: 560, width: '100%', padding: 40 }}>
        <StepBar total={4} current={step} />

        {step === 1 && (
          <div>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🚀</div>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 10 }}>Welcome to Job AutoPilot</h2>
            <p style={{ color: '#888', marginBottom: 24, fontSize: 14 }}>Your AI-powered job search co-pilot.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
              {[
                'Scores any job against your profile in 30 seconds',
                'Generates tailored resume + cover letter automatically',
                'Tracks every application and follows up for you',
                'Preps you for interviews with STAR answers',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, color: '#d0d0d0', fontSize: 14 }}>
                  <span style={{ color: '#22c55e', flexShrink: 0 }}>✦</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <p style={{ color: '#555', fontSize: 13, marginBottom: 20 }}>Let's get you set up. Takes about 3 minutes.</p>
            <button className="btn" onClick={() => setStep(2)} style={{ width: '100%', padding: '12px 0', fontSize: 15 }}>
              Get Started →
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Your Profile</h2>
            <p style={{ color: '#888', marginBottom: 24, fontSize: 14 }}>Confirm this looks right before we start scoring jobs.</p>

            {!editing ? (
              <>
                <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: 20, marginBottom: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{profile?.name || 'Your Profile'}</div>
                  <div style={{ color: '#888', fontSize: 13, marginBottom: 12 }}>
                    {profile?.email || ''}
                    {profile?.yearsExperience != null ? ` · ${profile.yearsExperience} years experience` : ''}
                  </div>
                  {(profile?.targetRoles || []).length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {profile.targetRoles.slice(0, 5).map((r, i) => (
                        <span key={i} style={{ background: '#2a2a2a', borderRadius: 4, color: '#d0d0d0', fontSize: 12, padding: '3px 8px' }}>{r}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button className="btn btn-ghost" onClick={() => setEditing(true)} style={{ flex: 1, padding: '10px 0' }}>Update Profile</button>
                  <button className="btn" onClick={() => setStep(3)} style={{ flex: 1, padding: '10px 0' }}>This Looks Right →</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Name</label>
                    <input className="form-input" value={profileForm.name || ''} onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Email</label>
                    <input className="form-input" value={profileForm.email || ''} onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label className="form-label">Target Roles</label>
                  <TagInput
                    tags={profileForm.targetRoles || []}
                    onAdd={r => setProfileForm(f => ({ ...f, targetRoles: [...(f.targetRoles || []), r] }))}
                    onRemove={i => setProfileForm(f => ({ ...f, targetRoles: f.targetRoles.filter((_, j) => j !== i) }))}
                    placeholder="Operations Manager..."
                  />
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button className="btn btn-ghost" onClick={() => { setEditing(false); setProfileForm(profile) }} style={{ flex: 1 }}>Cancel</button>
                  <button className="btn" onClick={saveProfile} style={{ flex: 1 }}>Save</button>
                </div>
              </>
            )}
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Connect Google</h2>
            <p style={{ color: '#888', marginBottom: 20, fontSize: 14 }}>Connect Google to scan Gmail for responses and save files to Drive.</p>

            <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: 20, marginBottom: 20 }}>
              {setupStatus?.checks?.googleConnected ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#22c55e', fontWeight: 600 }}>
                  <span style={{ fontSize: 20 }}>✓</span> Google Connected
                </div>
              ) : (
                <>
                  <p style={{ color: '#888', fontSize: 13, marginBottom: 12 }}>Run this in your terminal to connect:</p>
                  <code style={{ background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 6, color: '#d0d0d0', display: 'block', fontSize: 13, padding: '10px 14px', fontFamily: 'SF Mono, Fira Code, monospace' }}>
                    node scripts/setup-google.js
                  </code>
                </>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setStep(4)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', flex: 1, fontSize: 13, padding: '10px 0' }}>
                Skip for now — I'll connect later
              </button>
              <button className="btn" onClick={() => setStep(4)} style={{ flex: 1, padding: '10px 0' }}>Continue →</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Add Job Sources</h2>
            <p style={{ color: '#888', marginBottom: 20, fontSize: 14 }}>Add at least one source to discover jobs automatically.</p>

            <div style={{ marginBottom: 16 }}>
              <label className="form-label">RSS Feed URL</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="form-input"
                  placeholder="https://www.indeed.com/rss?q=operations+manager"
                  value={rssInput}
                  onChange={e => setRssInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { addSource('rss', rssInput); setRssInput('') } }}
                />
                <button className="btn btn-ghost" style={{ whiteSpace: 'nowrap' }} onClick={() => { addSource('rss', rssInput); setRssInput('') }}>Add</button>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="form-label">Company Career Page</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="form-input"
                  placeholder="https://boards.greenhouse.io/anthropic"
                  value={companyInput}
                  onChange={e => setCompanyInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { addSource('company', companyInput); setCompanyInput('') } }}
                />
                <button className="btn btn-ghost" style={{ whiteSpace: 'nowrap' }} onClick={() => { addSource('company', companyInput); setCompanyInput('') }}>Add</button>
              </div>
            </div>

            {sources.length > 0 && (
              <div style={{ marginBottom: 16, background: '#1a1a1a', borderRadius: 8, padding: '4px 12px' }}>
                {sources.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: i < sources.length - 1 ? '1px solid #2a2a2a' : 'none' }}>
                    <span style={{ color: s.type === 'rss' ? '#3b82f6' : '#a855f7', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>{s.type}</span>
                    <span style={{ color: '#d0d0d0', fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.value}</span>
                    <button onClick={() => setSources(ss => ss.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 16 }}>×</button>
                  </div>
                ))}
              </div>
            )}

            <button className="btn" onClick={finish} style={{ width: '100%', padding: '12px 0', fontSize: 15 }}>
              {sources.length === 0 ? 'Skip & Finish Setup' : 'Finish Setup →'}
            </button>
            {sources.length === 0 && (
              <p style={{ color: '#555', fontSize: 12, textAlign: 'center', marginTop: 8 }}>You can add sources later in Settings → Discovery</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
