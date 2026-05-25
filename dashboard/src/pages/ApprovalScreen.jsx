import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'

// Extract keywords from job description that are missing in the resume
function extractKeywords(jd, resume) {
  if (!jd) return []
  const resumeLower = (resume || '').toLowerCase()
  // Common tech/skill keywords to look for
  const patterns = [
    /\b(SQL|Python|JavaScript|TypeScript|React|Node\.js|AWS|GCP|Azure|Kubernetes|Docker|Terraform|Salesforce|HubSpot|Tableau|PowerBI|Excel|Slack|Jira|Confluence|Asana|Notion|Looker|dbt|Airflow|Snowflake|BigQuery|Redshift|Stripe|NetSuite|Workday|SAP|Oracle)\b/gi,
    /\b(OKRs?|KPIs?|SLA|SLO|RCA|P&L|COGS|ARR|MRR|NPS|CSAT|LTV|CAC|GTM|B2B|B2C|SaaS|SDLC|AGILE|SCRUM|KANBAN)\b/gi,
  ]
  const found = new Set()
  for (const pattern of patterns) {
    let m
    while ((m = pattern.exec(jd)) !== null) {
      const kw = m[0].toUpperCase()
      if (!resumeLower.includes(m[0].toLowerCase())) {
        found.add(kw)
      }
    }
  }
  return Array.from(found).slice(0, 10)
}

function ScoreDots({ score }) {
  if (score == null) return null
  const color = score >= 8 ? 'var(--green)' : score >= 6 ? 'var(--yellow)' : 'var(--red)'
  const filled = Math.round(score / 2)
  return (
    <span className="score-dots">
      {[1,2,3,4,5].map(i => (
        <span key={i} className="score-dot" style={{ background: i <= filled ? color : 'var(--border-hi)' }} />
      ))}
      <span style={{ color, fontSize: 13, fontWeight: 700, marginLeft: 6 }}>{score}/10</span>
    </span>
  )
}

function EditableText({ value, onChange }) {
  const [editing, setEditing] = useState(false)
  const ref = useRef(null)

  const activate = () => {
    setEditing(true)
    setTimeout(() => ref.current?.focus(), 0)
  }

  if (editing) {
    return (
      <textarea
        ref={ref}
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={() => setEditing(false)}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--blue)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--text)',
          fontFamily: 'var(--mono)',
          fontSize: 12,
          lineHeight: 1.7,
          minHeight: 400,
          outline: 'none',
          padding: 12,
          resize: 'vertical',
          width: '100%',
        }}
      />
    )
  }

  return (
    <div
      onClick={activate}
      title="Click to edit"
      style={{ cursor: 'text', position: 'relative' }}
    >
      <div
        className="doc-pre"
        style={{ minHeight: 200, maxHeight: 'none', cursor: 'text', border: '1px dashed var(--border-hi)' }}
      >
        {value || '(empty)'}
      </div>
      <div style={{ position: 'absolute', top: 8, right: 8, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-3)', fontSize: 10, padding: '2px 6px' }}>
        click to edit
      </div>
    </div>
  )
}

export default function ApprovalScreen({ onBack, addToast }) {
  const [items, setItems] = useState(null)
  const [idx, setIdx] = useState(0)
  const [resume, setResume] = useState('')
  const [coverLetter, setCoverLetter] = useState('')
  const [approving, setApproving] = useState(false)
  const [skipping, setSkipping] = useState(false)

  const load = () =>
    fetch('/api/approval-queue')
      .then(r => r.json())
      .then(d => {
        setItems(d)
        if (d.length > 0) {
          setResume(d[0].tailored_resume || '')
          setCoverLetter(d[0].cover_letter || '')
          setIdx(0)
        }
      })
      .catch(() => setItems([]))

  useEffect(() => { load() }, [])

  const item = items?.[idx]

  const goTo = (i) => {
    if (!items || i < 0 || i >= items.length) return
    setIdx(i)
    setResume(items[i].tailored_resume || '')
    setCoverLetter(items[i].cover_letter || '')
  }

  const approve = async () => {
    if (!item) return
    setApproving(true)
    try {
      const r = await fetch(`/api/approval-queue/${item.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume, coverLetter }),
      })
      const d = await r.json()
      if (d.error) throw new Error(d.error)
      addToast(`${item.company} approved → Apply queue`, 'success')
      const remaining = items.filter(i => i.id !== item.id)
      setItems(remaining)
      if (remaining.length > 0) goTo(0)
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setApproving(false)
    }
  }

  const skip = async () => {
    if (!item) return
    setSkipping(true)
    try {
      await fetch(`/api/approval-queue/${item.id}/skip`, { method: 'POST' })
      addToast('Skipped.', 'success')
      const remaining = items.filter(i => i.id !== item.id)
      setItems(remaining)
      if (remaining.length > 0) goTo(0)
    } finally {
      setSkipping(false)
    }
  }

  if (items === null) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <span className="spinner" style={{ width: 24, height: 24 }} />
    </div>
  )

  if (items.length === 0) return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
      <h2 style={{ fontWeight: 700, marginBottom: 8 }}>Queue empty</h2>
      <p style={{ color: 'var(--text-2)', marginBottom: 24 }}>All packages reviewed. Run discovery to find more jobs.</p>
      <button className="btn btn-ghost" onClick={onBack}>← Back to Brief</button>
    </div>
  )

  const jdText = item.job_description || ''
  const scoreData = item.fit_score

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Top bar */}
      <div className="approval-bar">
        <button className="btn btn-ghost btn-sm" onClick={onBack}>← Back</button>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontWeight: 600 }}>{item.company}</span>
          <span style={{ color: 'var(--text-3)' }}>·</span>
          <span style={{ color: 'var(--text-2)' }}>{item.role}</span>
          <ScoreDots score={item.fit_score} />
          {item.verdict && (
            <span className="status-badge" style={{
              background: scoreData >= 8 ? 'rgba(34,197,94,0.15)' : 'rgba(234,179,8,0.15)',
              color: scoreData >= 8 ? 'var(--green)' : 'var(--yellow)',
            }}>{item.verdict}</span>
          )}
        </div>
        <span style={{ color: 'var(--text-3)', fontSize: 12 }}>
          {idx + 1} of {items.length} pending
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => goTo(idx - 1)} disabled={idx === 0}>‹</button>
          <button className="btn btn-ghost btn-sm" onClick={() => goTo(idx + 1)} disabled={idx === items.length - 1}>›</button>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={skip} disabled={skipping} style={{ color: 'var(--text-2)' }}>
          {skipping ? '...' : 'Skip'}
        </button>
        <button className="btn btn-sm" onClick={approve} disabled={approving}>
          {approving ? <><span className="spinner" /> Approving...</> : 'Approve & Add to Queue →'}
        </button>
      </div>

      {/* Split screen */}
      <div className="approval-layout">
        {/* Left — Job */}
        <div className="approval-pane">
          <div className="section-label" style={{ marginBottom: 12 }}>Job Description</div>

          {item.fit_score != null && (
            <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
              <ScoreDots score={item.fit_score} />
              <span style={{ color: 'var(--text-2)', fontSize: 13 }}>{item.verdict}</span>
            </div>
          )}

          <div
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              fontSize: 13,
              lineHeight: 1.7,
              maxHeight: 'calc(100vh - 380px)',
              overflowY: 'auto',
              padding: '14px 16px',
              color: 'var(--text-2)',
              whiteSpace: 'pre-wrap',
            }}
          >
            {jdText.slice(0, 4000) || '(No job description saved)'}
          </div>

          {item.verdict && (
            <div style={{ marginTop: 14 }}>
              <div className="section-label" style={{ marginBottom: 8, fontSize: 10 }}>MISSING KEYWORDS</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {extractKeywords(jdText, resume).map((kw, i) => (
                  <span key={i} style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 4, color: 'var(--red)', fontSize: 11, padding: '2px 8px' }}>{kw}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right — Resume + Cover Letter */}
        <div className="approval-pane" style={{ borderRight: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div className="section-label">Your Resume</div>
            <span style={{ color: 'var(--text-3)', fontSize: 11 }}>Click text to edit</span>
          </div>

          <EditableText value={resume} onChange={setResume} />

          <div style={{ marginTop: 20 }}>
            <div className="section-label" style={{ marginBottom: 10 }}>Cover Letter</div>
            <EditableText value={coverLetter} onChange={setCoverLetter} />
          </div>
        </div>
      </div>
    </div>
  )
}
