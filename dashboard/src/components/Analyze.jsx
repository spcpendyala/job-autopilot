import { useState } from 'react'
import FitScoreDisplay from './FitScoreDisplay'

export default function Analyze({ onApply }) {
  const [jobUrl, setJobUrl] = useState('')
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [applied, setApplied] = useState(false)

  const handleScore = async () => {
    setError(null)
    setResult(null)
    setApplied(false)
    if (!jobUrl && !jobDescription) { setError('Enter a job URL or paste a job description.'); return }
    setLoading(true)
    try {
      const r = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobUrl: jobUrl || undefined, jobDescription: jobDescription || undefined, jobTitle: role, company }),
      })
      const d = await r.json()
      if (d.error) throw new Error(d.error)
      setResult(d)
      if (d.jobDescription) setJobDescription(d.jobDescription)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleApply = async (generateDocs) => {
    if (!result) return
    setApplying(true)
    setError(null)
    try {
      const r = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobUrl: jobUrl || undefined,
          jobDescription,
          jobTitle: role,
          company,
          fitScore: result.fitScore,
          atsGaps: result.atsGaps,
          generateDocs,
        }),
      })
      const d = await r.json()
      if (d.error) throw new Error(d.error)
      if (d.duplicate) { setError('Already processed this URL.'); return }
      setApplied(true)
      onApply && onApply()
    } catch (err) {
      setError(err.message)
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="analyze-wrap">
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 20, fontWeight: 600, fontSize: 15 }}>Score a New Job</div>

        {error && <div className="error-msg">{error}</div>}

        <div className="form-group">
          <label className="form-label">Job URL</label>
          <input className="form-input" placeholder="https://..." value={jobUrl} onChange={e => setJobUrl(e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Company</label>
            <input className="form-input" placeholder="Acme Corp" value={company} onChange={e => setCompany(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Role Title</label>
            <input className="form-input" placeholder="Operations Manager" value={role} onChange={e => setRole(e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Paste Job Description (optional — overrides URL)</label>
          <textarea className="form-textarea" placeholder="Paste the full job description here..." value={jobDescription} onChange={e => setJobDescription(e.target.value)} style={{ minHeight: 160 }} />
        </div>

        <button className="btn" onClick={handleScore} disabled={loading}>
          {loading ? <><span className="spinner" style={{ marginRight: 8 }} />Scoring…</> : 'Score Job'}
        </button>
      </div>

      {result && (
        <div className="analyze-result">
          <div className="card" style={{ marginBottom: 16 }}>
            <FitScoreDisplay fitScore={result.fitScore} atsGaps={result.atsGaps} />
          </div>

          {!applied ? (
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-ghost" onClick={() => handleApply(false)} disabled={applying}>
                {applying ? <span className="spinner" /> : 'Save to Pipeline'}
              </button>
              <button className="btn" onClick={() => handleApply(true)} disabled={applying}>
                {applying ? <><span className="spinner" style={{ marginRight: 8 }} />Generating…</> : '✨ Generate Full Package'}
              </button>
            </div>
          ) : (
            <div style={{ background: '#14332a', border: '1px solid #22c55e', borderRadius: 6, color: '#22c55e', padding: '10px 16px', fontSize: 13 }}>
              ✅ Saved to pipeline. Check the Pipeline tab.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
