import { useState, useEffect } from 'react'
import FitScoreDisplay from './FitScoreDisplay'

const STATUS_OPTIONS = ['discovered', 'applied', 'responded', 'interview', 'interview-prep-ready', 'rejected', 'offer']

const DOC_TABS = [
  { id: 'score', label: 'Score' },
  { id: 'resume', label: 'Resume' },
  { id: 'coverletter', label: 'Cover Letter' },
  { id: 'companybrief', label: 'Company Brief' },
  { id: 'interviewprep', label: 'Interview Prep' },
  { id: 'salary', label: 'Salary' },
]

function ScriptCard({ label, text }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text || '').then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 8, padding: '14px 16px', marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ color: '#888', fontSize: 11 }}>{label}</span>
        <button onClick={copy} style={{ background: 'none', border: '1px solid #333', borderRadius: 4, color: copied ? '#22c55e' : '#888', fontSize: 11, padding: '2px 8px', cursor: 'pointer' }}>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <div style={{ color: '#d0d0d0', fontSize: 13, lineHeight: 1.6, fontStyle: 'italic' }}>"{text}"</div>
    </div>
  )
}

function statusStyle(status) {
  const map = {
    discovered:           { bg: '#2a2a2a', color: '#888' },
    applied:              { bg: '#1e3a5f', color: '#3b82f6' },
    responded:            { bg: '#3d2e00', color: '#eab308' },
    interview:            { bg: '#14332a', color: '#22c55e' },
    'interview-prep-ready': { bg: '#14332a', color: '#22c55e' },
    rejected:             { bg: '#3d1515', color: '#ef4444' },
    offer:                { bg: '#2d1a5e', color: '#a855f7' },
  }
  return map[status] || { bg: '#2a2a2a', color: '#888' }
}

export default function ApplicationDetail({ appId, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('score')
  const [status, setStatus] = useState('')
  const [prepLoading, setPrepLoading] = useState(false)
  const [prepError, setPrepError] = useState(null)

  const load = () => {
    setLoading(true)
    fetch(`/api/applications/${appId}`)
      .then(r => r.json())
      .then(d => { setData(d); setStatus(d.status || 'discovered'); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [appId])

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value
    setStatus(newStatus)
    await fetch(`/api/applications/${appId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
  }

  const handleGeneratePrep = async () => {
    setPrepLoading(true)
    setPrepError(null)
    try {
      const r = await fetch(`/api/prep/${appId}`, { method: 'POST' })
      const d = await r.json()
      if (!d.success) throw new Error(d.error || 'Failed')
      load()
      setActiveTab('interviewprep')
    } catch (err) {
      setPrepError(err.message)
    } finally {
      setPrepLoading(false)
    }
  }

  if (loading) return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ padding: 48, textAlign: 'center' }}><span className="spinner" /></div>
      </div>
    </div>
  )

  if (!data) return null
  const files = data.files || {}
  const scoreDetails = data.scoreDetails
  const st = statusStyle(status)

  const tabContent = () => {
    switch (activeTab) {
      case 'score':
        return scoreDetails
          ? <FitScoreDisplay fitScore={scoreDetails} atsGaps={null} />
          : <div className="empty">No score data available.</div>
      case 'resume':
        return files.resume
          ? <pre className="doc-pre">{files.resume}</pre>
          : <div className="empty">No resume generated yet. Run apply --full to generate docs.</div>
      case 'coverletter':
        return files.coverLetter
          ? <pre className="doc-pre">{files.coverLetter}</pre>
          : <div className="empty">No cover letter generated yet.</div>
      case 'companybrief':
        if (!files.companyBrief) return <div className="empty">No company brief generated yet.</div>
        try {
          const parsed = JSON.parse(files.companyBrief)
          return <pre className="doc-pre">{JSON.stringify(parsed, null, 2)}</pre>
        } catch {
          return <pre className="doc-pre">{files.companyBrief}</pre>
        }
      case 'interviewprep':
        if (files.interviewPrep) return <pre className="doc-pre">{files.interviewPrep}</pre>
        return (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ color: '#888', marginBottom: 20 }}>No interview prep generated yet.</div>
            {prepError && <div className="error-msg">{prepError}</div>}
            <button className="btn btn-blue" onClick={handleGeneratePrep} disabled={prepLoading}>
              {prepLoading ? <span className="spinner" /> : '🎯 Generate Interview Prep'}
            </button>
          </div>
        )
      case 'salary': {
        if (!files.salaryBrief) return (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ color: '#888', marginBottom: 12 }}>No salary brief generated yet.</div>
            <div style={{ color: '#666', fontSize: 13 }}>Run <code style={{ background: '#1a1a1a', padding: '2px 6px', borderRadius: 4 }}>npm run prep {data.id}</code> to generate.</div>
          </div>
        )
        let sb
        try { sb = JSON.parse(files.salaryBrief) } catch { return <pre className="doc-pre">{files.salaryBrief}</pre> }
        const mr = sb.marketRange || {}
        const ns = sb.negotiationScript || {}
        return (
          <div style={{ padding: '4px 0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div style={{ background: '#3d1515', border: '1px solid #ef4444', borderRadius: 8, padding: 16, textAlign: 'center' }}>
                <div style={{ color: '#888', fontSize: 11, marginBottom: 4 }}>LOW</div>
                <div style={{ color: '#ef4444', fontSize: 20, fontWeight: 700 }}>{mr.low}</div>
              </div>
              <div style={{ background: '#3d2e00', border: '1px solid #eab308', borderRadius: 8, padding: 16, textAlign: 'center' }}>
                <div style={{ color: '#888', fontSize: 11, marginBottom: 4 }}>MID</div>
                <div style={{ color: '#eab308', fontSize: 20, fontWeight: 700 }}>{mr.mid}</div>
              </div>
              <div style={{ background: '#14332a', border: '1px solid #22c55e', borderRadius: 8, padding: 16, textAlign: 'center' }}>
                <div style={{ color: '#888', fontSize: 11, marginBottom: 4 }}>HIGH</div>
                <div style={{ color: '#22c55e', fontSize: 20, fontWeight: 700 }}>{mr.high}</div>
              </div>
            </div>

            <div style={{ background: '#0d1f3c', border: '1px solid #3b82f6', borderRadius: 8, padding: 20, textAlign: 'center', marginBottom: 20 }}>
              <div style={{ color: '#888', fontSize: 12, marginBottom: 6 }}>YOUR ASK</div>
              <div style={{ color: '#3b82f6', fontSize: 34, fontWeight: 700 }}>{sb.recommendedAsk}</div>
              <div style={{ color: '#666', fontSize: 12, marginTop: 8 }}>Anchor: {sb.anchorPoint} · Walk Away: {sb.walkAwayNumber}</div>
            </div>

            {sb.reasoning && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>Why These Numbers</div>
                <div style={{ color: '#888', fontSize: 13, lineHeight: 1.6 }}>{sb.reasoning}</div>
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 13 }}>What to Say</div>
              <ScriptCard label='When asked "What are your salary expectations?"' text={ns.openingLine} />
              <ScriptCard label="When they counter below your ask" text={ns.counterOffer} />
              <ScriptCard label="To close or defer" text={ns.closingLine} />
            </div>

            {(sb.benefitsToNegotiate || []).length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 13 }}>Also Negotiate</div>
                <div style={{ background: '#1a1a1a', borderRadius: 8, padding: '4px 16px' }}>
                  {sb.benefitsToNegotiate.map((b, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < sb.benefitsToNegotiate.length - 1 ? '1px solid #2a2a2a' : 'none' }}>
                      <span style={{ color: '#22c55e', fontSize: 16 }}>☐</span>
                      <span style={{ color: '#d0d0d0', fontSize: 13 }}>{b}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sb.marketContext && (
              <div>
                <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>Market Context</div>
                <div style={{ color: '#888', fontSize: 13, lineHeight: 1.6 }}>{sb.marketContext}</div>
              </div>
            )}
          </div>
        )
      }
      default:
        return null
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ flex: 1 }}>
            <div className="modal-title">{data.company}</div>
            <div className="modal-subtitle">{data.role}</div>
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ background: st.bg, color: st.color, borderRadius: 100, fontSize: 11, fontWeight: 600, padding: '3px 10px' }}>
                {status}
              </span>
              {data.fit_score && (
                <span style={{ color: data.fit_score >= 8 ? '#22c55e' : data.fit_score >= 6 ? '#eab308' : '#ef4444', fontWeight: 700, fontSize: 16 }}>
                  {data.fit_score}/10
                </span>
              )}
              <select className="form-select" value={status} onChange={handleStatusChange} style={{ width: 'auto', padding: '4px 8px', fontSize: 12 }}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-tabs">
          {DOC_TABS.map(t => (
            <button key={t.id} className={activeTab === t.id ? 'active' : ''} onClick={() => setActiveTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="modal-body">{tabContent()}</div>
      </div>
    </div>
  )
}
