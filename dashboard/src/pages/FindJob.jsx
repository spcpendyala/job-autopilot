import { useState, useEffect } from 'react'
import FitScoreDisplay from '../components/FitScoreDisplay'

const STEPS = [
  { label: 'Input', desc: 'Paste a job URL or description' },
  { label: 'Score', desc: 'Review fit score and ATS gaps' },
  { label: 'Package', desc: 'Generate documents' },
]

function ProgressBar({ currentStep }) {
  return (
    <div style={{ display: 'flex', gap: 0, marginBottom: 32, background: '#1a1a1a', borderRadius: 10, overflow: 'hidden', border: '1px solid #2a2a2a' }}>
      {STEPS.map((s, i) => {
        const active = currentStep === i + 1
        const done = currentStep > i + 1
        return (
          <div key={s.label} style={{ flex: 1, padding: '12px 16px', background: done ? '#14332a' : active ? '#0d1f3c' : 'transparent', borderRight: i < STEPS.length - 1 ? '1px solid #2a2a2a' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, background: done ? '#22c55e' : active ? '#3b82f6' : '#2a2a2a', color: done || active ? '#000' : '#555', flexShrink: 0 }}>
                {done ? '✓' : i + 1}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: done ? '#22c55e' : active ? '#f0f0f0' : '#555' }}>{s.label}</div>
                <div style={{ fontSize: 11, color: '#555' }}>{s.desc}</div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function FindJob({ prefillUrl, onNavigatePipeline, addToast }) {
  const [step, setStep] = useState(1)
  const [jobUrl, setJobUrl] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [scoring, setScoring] = useState(false)
  const [scoringMsg, setScoringMsg] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [applicationId, setApplicationId] = useState(null)
  const [markingApplied, setMarkingApplied] = useState(false)

  useEffect(() => {
    if (prefillUrl) {
      setJobUrl(prefillUrl)
      setJobDescription('')
      setCompany('')
      setRole('')
      setResult(null)
      setApplicationId(null)
      setError(null)
      setStep(1)
    }
  }, [prefillUrl])

  const score = async () => {
    if (!jobUrl.trim() && !jobDescription.trim()) {
      setError('Enter a job URL or paste a job description.')
      return
    }
    setError(null)
    setScoring(true)
    setScoringMsg('Fetching job description...')
    const t1 = setTimeout(() => setScoringMsg('Scoring with Claude...'), 3000)
    const t2 = setTimeout(() => setScoringMsg('Scanning ATS keywords...'), 7000)
    try {
      const r = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobUrl: jobUrl.trim() || undefined,
          jobDescription: jobDescription.trim() || undefined,
          jobTitle: role.trim() || undefined,
          company: company.trim() || undefined,
        }),
      })
      const d = await r.json()
      if (d.error) throw new Error(d.error)
      if (d.jobDescription) setJobDescription(d.jobDescription)
      setResult(d)
      setStep(2)
    } catch (err) {
      setError(err.message)
    } finally {
      clearTimeout(t1)
      clearTimeout(t2)
      setScoring(false)
      setScoringMsg('')
    }
  }

  const generatePackage = async () => {
    setGenerating(true)
    setError(null)
    try {
      const r = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobUrl: jobUrl.trim() || undefined,
          jobDescription: jobDescription.trim(),
          jobTitle: role.trim() || undefined,
          company: company.trim() || undefined,
          fitScore: result.fitScore,
          atsGaps: result.atsGaps,
          generateDocs: true,
        }),
      })
      const d = await r.json()
      if (d.error) throw new Error(d.error)
      if (d.duplicate) { addToast('Already tracked this URL.', 'warning'); return }
      setApplicationId(d.applicationId)
      setStep(3)
    } catch (err) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  const saveOnly = async () => {
    setGenerating(true)
    try {
      const r = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobUrl: jobUrl.trim() || undefined,
          jobDescription: jobDescription.trim(),
          jobTitle: role.trim() || undefined,
          company: company.trim() || undefined,
          fitScore: result.fitScore,
          atsGaps: result.atsGaps,
          generateDocs: false,
        }),
      })
      const d = await r.json()
      if (d.error) throw new Error(d.error)
      addToast('Saved to pipeline.', 'success')
      onNavigatePipeline()
    } catch (err) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  const markApplied = async () => {
    if (!applicationId) { onNavigatePipeline(); return }
    setMarkingApplied(true)
    try {
      await fetch(`/api/applications/${applicationId}/mark-applied`, { method: 'POST' })
      addToast('Marked as applied! View it in Pipeline.', 'success')
      onNavigatePipeline()
    } catch {
      addToast('Could not update status.', 'error')
    } finally {
      setMarkingApplied(false)
    }
  }

  const reset = () => {
    setStep(1)
    setJobUrl('')
    setJobDescription('')
    setCompany('')
    setRole('')
    setResult(null)
    setApplicationId(null)
    setError(null)
  }

  return (
    <div style={{ padding: 32, maxWidth: 720 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Find a Job</h1>

      <ProgressBar currentStep={step} />

      {error && (
        <div className="error-msg" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>
      )}

      {/* Step 1 — Input */}
      {step === 1 && (
        <div className="card">
          <div className="form-group">
            <label className="form-label">Job URL</label>
            <input
              className="form-input"
              placeholder="https://..."
              value={jobUrl}
              onChange={e => setJobUrl(e.target.value)}
            />
            <div style={{ color: '#555', fontSize: 12, marginTop: 4 }}>We'll fetch the description automatically</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0 16px', color: '#444', fontSize: 13 }}>
            <div style={{ flex: 1, height: 1, background: '#2a2a2a' }} />
            <span>or paste the description directly</span>
            <div style={{ flex: 1, height: 1, background: '#2a2a2a' }} />
          </div>

          <div className="form-group">
            <textarea
              className="form-textarea"
              placeholder="Paste the full job description here..."
              value={jobDescription}
              onChange={e => setJobDescription(e.target.value)}
              style={{ minHeight: 140 }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Company Name</label>
              <input className="form-input" placeholder="Anthropic" value={company} onChange={e => setCompany(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Role Title</label>
              <input className="form-input" placeholder="Operations Manager" value={role} onChange={e => setRole(e.target.value)} />
            </div>
          </div>

          {scoring ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <span className="spinner" style={{ width: 24, height: 24, borderWidth: 3 }} />
              <div style={{ color: '#888', fontSize: 14, marginTop: 14 }}>🧠 Analyzing with Claude... (~15 seconds)</div>
              <div style={{ color: '#555', fontSize: 12, marginTop: 6 }}>{scoringMsg}</div>
            </div>
          ) : (
            <button className="btn" onClick={score} style={{ width: '100%', padding: '12px 0', fontSize: 15 }}>
              Score This Job →
            </button>
          )}
        </div>
      )}

      {/* Step 2 — Score Results */}
      {step === 2 && result && (
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <FitScoreDisplay fitScore={result.fitScore} atsGaps={result.atsGaps} />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={saveOnly}
              disabled={generating}
              style={{ background: 'none', border: '1px solid #2a2a2a', borderRadius: 8, color: '#888', cursor: generating ? 'default' : 'pointer', fontSize: 13, padding: '10px 20px', opacity: generating ? 0.5 : 1 }}
            >
              Skip — Not Worth Applying
            </button>
            <button className="btn" onClick={generatePackage} disabled={generating} style={{ flex: 1, padding: '10px 0', fontSize: 15 }}>
              {generating
                ? <><span className="spinner" style={{ marginRight: 8 }} />Generating...</>
                : '✨ Generate Full Package'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — Package Ready */}
      {step === 3 && (
        <div className="card">
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Your application package is ready</h2>
            <div style={{ color: '#888', fontSize: 14 }}>Everything you need to apply — generated and saved.</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
            {[
              { icon: '📄', label: 'Resume', hint: 'Tailored to this job description' },
              { icon: '✉️', label: 'Cover Letter', hint: 'Personalized opening' },
              { icon: '🏢', label: 'Company Brief', hint: 'Research and talking points' },
              { icon: '🔍', label: 'Other Roles', hint: 'More openings at this company' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#1a1a1a', borderRadius: 8, padding: '12px 16px' }}>
                <span style={{ fontSize: 20 }}>{item.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{item.label}</div>
                  <div style={{ color: '#555', fontSize: 12 }}>{item.hint}</div>
                </div>
                <span style={{ color: '#22c55e', fontSize: 12 }}>✓ Ready</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={reset}
              style={{ background: 'none', border: '1px solid #2a2a2a', borderRadius: 8, color: '#888', cursor: 'pointer', fontSize: 13, padding: '10px 20px' }}
            >
              Find Another Job
            </button>
            <button className="btn" onClick={markApplied} disabled={markingApplied} style={{ flex: 1, padding: '10px 0', fontSize: 15 }}>
              {markingApplied ? '...' : '✓ Mark as Applied'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
