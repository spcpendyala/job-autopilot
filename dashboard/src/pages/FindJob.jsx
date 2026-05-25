import { useState, useEffect } from 'react'

const STEPS = [
  { label: 'Input', desc: 'Paste a job URL or description' },
  { label: 'Score', desc: 'Review fit score and ATS gaps' },
  { label: 'Package', desc: 'Generate application documents' },
]

function ScoreDots({ score }) {
  const color = score >= 8 ? 'var(--green)' : score >= 6 ? 'var(--yellow)' : 'var(--red)'
  return (
    <span className="score-dots">
      {[1, 2, 3, 4, 5].map(i => (
        <span
          key={i}
          className="score-dot"
          style={{ background: i <= Math.round(score / 2) ? color : 'var(--border-hi)' }}
        />
      ))}
      <span style={{ color, fontWeight: 700, fontSize: 15 }}>{score}</span>
    </span>
  )
}

function ProgressBar({ currentStep }) {
  return (
    <div style={{ display: 'flex', gap: 0, marginBottom: 28, background: 'var(--surface)', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)' }}>
      {STEPS.map((s, i) => {
        const active = currentStep === i + 1
        const done = currentStep > i + 1
        return (
          <div key={s.label} style={{ flex: 1, padding: '12px 16px', background: done ? 'var(--green-dim)' : active ? 'var(--blue-dim)' : 'transparent', borderRight: i < STEPS.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, background: done ? 'var(--green)' : active ? 'var(--blue)' : 'var(--border-hi)', color: done || active ? '#fff' : 'var(--text-3)', flexShrink: 0 }}>
                {done ? '✓' : i + 1}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: done ? 'var(--green)' : active ? 'var(--text)' : 'var(--text-3)' }}>{s.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{s.desc}</div>
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

  const addToApplyQueue = async () => {
    if (!applicationId) { onNavigatePipeline(); return }
    setMarkingApplied(true)
    try {
      await fetch(`/api/applications/${applicationId}/mark-applied`, { method: 'POST' })
      addToast('Added to apply queue! View it in Pipeline.', 'success')
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

  const fitScore = result?.fitScore
  const atsGaps = result?.atsGaps
  const scoreColor = !fitScore ? 'var(--text-2)' : fitScore.score >= 8 ? 'var(--green)' : fitScore.score >= 6 ? 'var(--yellow)' : 'var(--red)'

  return (
    <div style={{ padding: 32, maxWidth: 720 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Find a Job</h1>

      <ProgressBar currentStep={step} />

      {error && (
        <div className="error-msg" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 18 }}>×</button>
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
              onKeyDown={e => e.key === 'Enter' && score()}
            />
            <p style={{ fontSize: 12, color: '#555', marginTop: 6, marginBottom: 0 }}>Works with LinkedIn, Greenhouse, Lever, Indeed, and most job boards</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0 16px', color: 'var(--text-3)', fontSize: 13 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span>or paste description directly</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          <div className="form-group">
            <textarea
              className="form-textarea"
              placeholder="Paste the full job description here..."
              value={jobDescription}
              onChange={e => setJobDescription(e.target.value)}
              style={{ minHeight: 140 }}
            />
            <p style={{ fontSize: 12, color: '#555', marginTop: 6, marginBottom: 0 }}>Paste the full job description if the URL doesn't work</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Company</label>
              <input className="form-input" placeholder="Anthropic" value={company} onChange={e => setCompany(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Role</label>
              <input className="form-input" placeholder="Operations Manager" value={role} onChange={e => setRole(e.target.value)} />
            </div>
          </div>

          {scoring ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <span className="spinner" style={{ width: 24, height: 24, borderWidth: 3 }} />
              <div style={{ color: 'var(--text-2)', fontSize: 14, marginTop: 14 }}>Analyzing with Claude... (~15s)</div>
              <div style={{ color: 'var(--text-3)', fontSize: 12, marginTop: 6 }}>{scoringMsg}</div>
            </div>
          ) : (
            <button className="btn" onClick={score} disabled={scoring} style={{ width: '100%', padding: '12px 0', fontSize: 15, opacity: scoring ? 0.6 : 1, cursor: scoring ? 'not-allowed' : 'pointer' }}>
              {scoring ? '⟳ Analyzing with Claude...' : 'Analyze Job'}
            </button>
          )}
        </div>
      )}

      {/* Step 2 — Score Results */}
      {step === 2 && fitScore && (
        <div>
          {/* Score hero */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 20 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 72, fontWeight: 800, color: scoreColor, lineHeight: 1 }}>{fitScore.score}</div>
                <ScoreDots score={fitScore.score} />
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{fitScore.verdict}</div>
                <div style={{ color: 'var(--text-2)', fontSize: 14 }}>{fitScore.oneLineSummary}</div>
              </div>
            </div>

            {/* Match / Gaps two-column */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div>
                <div style={{ color: 'var(--green)', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 8 }}>Matching</div>
                {(fitScore.topMatchingSkills || []).map((s, i) => (
                  <div key={i} style={{ color: 'var(--text)', fontSize: 13, marginBottom: 5 }}>✓ {s}</div>
                ))}
              </div>
              <div>
                <div style={{ color: 'var(--red)', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 8 }}>Gaps</div>
                {(fitScore.keyGaps || []).map((g, i) => (
                  <div key={i} style={{ color: 'var(--text)', fontSize: 13, marginBottom: 5 }}>✗ {g}</div>
                ))}
              </div>
            </div>

            {/* ATS keywords */}
            {atsGaps && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ color: 'var(--text-2)', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 10 }}>ATS Keywords to Add</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(atsGaps.criticalMissing || []).map((k, i) => (
                    <span key={i} className="tag" style={{ background: 'var(--red-dim)', color: 'var(--red)', border: '1px solid rgba(239,68,68,0.3)' }}>{k}</span>
                  ))}
                  {(atsGaps.niceToHaveMissing || []).map((k, i) => (
                    <span key={i} className="tag" style={{ background: 'var(--yellow-dim)', color: 'var(--yellow)', border: '1px solid rgba(234,179,8,0.3)' }}>{k}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Tailoring tips */}
            {(fitScore.tailoringTips || []).length > 0 && (
              <div>
                <div style={{ color: 'var(--text-2)', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 10 }}>Tailoring Tips</div>
                <ol style={{ paddingLeft: 18, margin: 0 }}>
                  {fitScore.tailoringTips.map((t, i) => (
                    <li key={i} style={{ color: 'var(--text)', fontSize: 13, marginBottom: 6 }}>{t}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
            <button
              className="btn"
              onClick={generatePackage}
              disabled={generating}
              style={{ background: '#22c55e', color: '#000', padding: '14px 24px', fontSize: 15, fontWeight: 600, border: 'none', borderRadius: 6, cursor: generating ? 'not-allowed' : 'pointer', width: '100%', opacity: generating ? 0.7 : 1 }}
            >
              {generating
                ? <><span className="spinner" style={{ marginRight: 8 }} />Generating Package...</>
                : '✨ Generate Full Package'}
            </button>
            <button
              onClick={saveOnly}
              disabled={generating}
              style={{ background: 'transparent', border: '1px solid #333', color: '#999', padding: '14px 24px', borderRadius: 6, cursor: generating ? 'not-allowed' : 'pointer', width: '100%', fontSize: 14 }}
            >
              Not Worth It
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — Package Ready */}
      {step === 3 && (
        <div className="card">
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Package Ready</h2>
            <div style={{ color: 'var(--text-2)', fontSize: 14 }}>Everything generated and saved to your outputs folder.</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
            {[
              { icon: '📄', label: 'Resume', hint: 'Tailored to this role' },
              { icon: '✉️', label: 'Cover Letter', hint: 'Personalized opening' },
              { icon: '🏢', label: 'Company Brief', hint: 'Research and talking points' },
              { icon: '☁️', label: 'Saved to Drive', hint: 'Accessible anywhere' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '12px 16px' }}>
                <span style={{ fontSize: 20 }}>{item.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{item.label}</div>
                  <div style={{ color: 'var(--text-3)', fontSize: 12 }}>{item.hint}</div>
                </div>
                <span style={{ color: 'var(--green)', fontSize: 12, fontWeight: 600 }}>✓ Ready</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={reset}
              style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-2)', cursor: 'pointer', fontSize: 13, padding: '10px 20px' }}
            >
              Find Another →
            </button>
            <button className="btn" onClick={addToApplyQueue} disabled={markingApplied} style={{ flex: 1, padding: '10px 0', fontSize: 15 }}>
              {markingApplied ? 'Adding...' : '+ Add to Apply Queue'}
            </button>
          </div>
          <a href="/api/applications/export-csv" style={{ display: 'block', textAlign: 'center', color: '#555', fontSize: 12, marginTop: 16, textDecoration: 'underline' }}>Export all applications as CSV</a>
        </div>
      )}
    </div>
  )
}
