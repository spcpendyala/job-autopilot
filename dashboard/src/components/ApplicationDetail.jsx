import { useState, useEffect } from 'react'
import FitScoreDisplay from './FitScoreDisplay'

const STATUS_OPTIONS = ['discovered', 'applied', 'responded', 'interview', 'interview-prep-ready', 'rejected', 'offer']

const DOC_TABS = [
  { id: 'score', label: 'Score' },
  { id: 'resume', label: 'Resume' },
  { id: 'coverletter', label: 'Cover Letter' },
  { id: 'companybrief', label: 'Company Brief' },
  { id: 'interviewprep', label: 'Interview Prep' },
]

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
