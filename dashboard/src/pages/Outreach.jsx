import { useState, useEffect } from 'react'

function StatusBadge({ status }) {
  const map = {
    draft: { color: 'var(--text-2)', bg: 'var(--border)' },
    sent: { color: 'var(--blue)', bg: 'var(--blue-dim)' },
    replied: { color: 'var(--green)', bg: 'var(--green-dim)' },
    ignored: { color: 'var(--text-3)', bg: 'var(--border)' },
  }
  const s = map[status] || map.draft
  return (
    <span className="status-badge" style={{ background: s.bg, color: s.color, border: 'none' }}>
      {status}
    </span>
  )
}

function daysSince(dateStr) {
  if (!dateStr) return null
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.floor(diff / 86400000)
}

function OutreachModal({ onClose, addToast, onSaved }) {
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [recruiter, setRecruiter] = useState(null)
  const [finding, setFinding] = useState(false)
  const [jobDescription, setJobDescription] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [drafting, setDrafting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [outreachId, setOutreachId] = useState(null)

  const findRecruiter = async () => {
    if (!company.trim()) { addToast('Enter a company name.', 'error'); return }
    setFinding(true)
    setRecruiter(null)
    try {
      const r = await fetch('/api/outreach/find', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: company.trim(), role: role.trim() }),
      })
      const d = await r.json()
      setRecruiter(d)
    } catch {
      addToast('Could not find recruiter info.', 'error')
    } finally {
      setFinding(false)
    }
  }

  const draftMessage = async () => {
    if (!company.trim()) { addToast('Enter a company name.', 'error'); return }
    setDrafting(true)
    try {
      const r = await fetch('/api/outreach/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: company.trim(),
          role: role.trim(),
          recruiterInfo: recruiter || { name: '', title: 'Hiring Team', email: '', linkedin: '' },
          jobDescription: jobDescription.trim(),
        }),
      })
      const d = await r.json()
      if (d.error) throw new Error(d.error)
      setSubject(d.subject || '')
      setBody(d.body || '')
      setOutreachId(d.outreachId)
    } catch (err) {
      addToast(err.message || 'Draft failed.', 'error')
    } finally {
      setDrafting(false)
    }
  }

  const saveDraft = async () => {
    if (!body.trim()) { addToast('Generate a draft first.', 'error'); return }
    setSaving(true)
    try {
      if (!outreachId) await draftMessage()
      addToast('Draft saved.', 'success')
      onSaved()
      onClose()
    } catch {
      addToast('Could not save draft.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const copyAndMarkSent = async () => {
    if (!body.trim()) { addToast('Generate a draft first.', 'error'); return }
    const fullEmail = `Subject: ${subject}\n\n${body}`
    try {
      await navigator.clipboard.writeText(fullEmail)
    } catch {}
    if (outreachId) {
      try {
        await fetch(`/api/outreach/${outreachId}/mark-sent`, { method: 'POST' })
      } catch {}
    }
    addToast('Copied to clipboard and marked as sent.', 'success')
    onSaved()
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 28, width: 560, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>New Outreach</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', fontSize: 22, lineHeight: 1 }}>×</button>
        </div>

        {/* Company + Role */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Company</label>
            <input className="form-input" placeholder="Anthropic" value={company} onChange={e => setCompany(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Role</label>
            <input className="form-input" placeholder="Operations Manager" value={role} onChange={e => setRole(e.target.value)} />
          </div>
        </div>

        <button className="btn btn-ghost" onClick={findRecruiter} disabled={finding} style={{ width: '100%', marginBottom: 20 }}>
          {finding ? <><span className="spinner" style={{ marginRight: 8 }} />Finding...</> : 'Find Recruiter Info →'}
        </button>

        {/* Recruiter result */}
        {recruiter && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
              Found{recruiter.confidence ? ` · ${recruiter.confidence} confidence` : ''}
            </div>
            {recruiter.name ? (
              <div style={{ fontWeight: 600, marginBottom: 2 }}>{recruiter.name}</div>
            ) : null}
            <div style={{ color: 'var(--text-2)', fontSize: 14 }}>{recruiter.title || 'Hiring Team'}</div>
            {recruiter.email && <div style={{ color: 'var(--text-3)', fontSize: 12, marginTop: 4 }}>{recruiter.email}</div>}
          </div>
        )}

        {/* Optional JD for better draft */}
        <div className="form-group">
          <label className="form-label">Job Description (optional — improves the draft)</label>
          <textarea
            className="form-textarea"
            placeholder="Paste a few key lines from the job posting..."
            value={jobDescription}
            onChange={e => setJobDescription(e.target.value)}
            style={{ minHeight: 80 }}
          />
        </div>

        <button className="btn btn-ghost" onClick={draftMessage} disabled={drafting} style={{ width: '100%', marginBottom: 20 }}>
          {drafting ? <><span className="spinner" style={{ marginRight: 8 }} />Drafting...</> : 'Draft Message →'}
        </button>

        {/* Draft output */}
        {body && (
          <div style={{ marginBottom: 20 }}>
            <div className="form-group">
              <label className="form-label">Subject</label>
              <input className="form-input" value={subject} onChange={e => setSubject(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Message</label>
              <textarea
                className="form-textarea"
                value={body}
                onChange={e => setBody(e.target.value)}
                style={{ minHeight: 120, fontFamily: 'var(--mono)', fontSize: 13 }}
              />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-ghost" onClick={saveDraft} disabled={saving} style={{ flex: 1 }}>
            Save Draft
          </button>
          <button className="btn" onClick={copyAndMarkSent} style={{ flex: 1 }}>
            Copy & Mark Sent
          </button>
        </div>
      </div>
    </div>
  )
}

function OutreachGroup({ title, items, onMarkSent, onMarkReplied, followUpDue }) {
  if (items.length === 0) return null
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</div>
        <span className="nav-badge">{items.length}</span>
        {followUpDue > 0 && <span style={{ color: 'var(--yellow)', fontSize: 12 }}>· {followUpDue} follow-up due</span>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map(item => {
          const sentDays = daysSince(item.sent_at)
          const needsFollowUp = sentDays !== null && sentDays >= 7 && item.status === 'sent'
          return (
            <div key={item.id} className="card" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{item.company}</span>
                    <StatusBadge status={item.status} />
                    {needsFollowUp && (
                      <span className="status-badge" style={{ background: 'var(--yellow-dim)', color: 'var(--yellow)', border: 'none', fontSize: 11 }}>
                        follow-up due
                      </span>
                    )}
                  </div>
                  <div style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 2 }}>
                    {item.role}
                  </div>
                  <div style={{ color: 'var(--text-3)', fontSize: 12 }}>
                    {item.contact_name ? `${item.contact_name}` : 'Hiring Team'}
                    {item.contact_title ? ` · ${item.contact_title}` : ''}
                    {sentDays !== null ? ` · sent ${sentDays}d ago` : ''}
                  </div>
                  {item.draft_message && (
                    <div style={{ marginTop: 10, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', fontSize: 12, color: 'var(--text-2)', fontFamily: 'var(--mono)', whiteSpace: 'pre-wrap', maxHeight: 80, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                      {item.draft_message}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexDirection: 'column', alignItems: 'flex-end' }}>
                  {item.status === 'draft' && (
                    <button className="btn btn-sm" onClick={() => onMarkSent(item.id)}>Mark Sent</button>
                  )}
                  {item.status === 'sent' && (
                    <button className="btn btn-sm" onClick={() => onMarkReplied(item.id)}>Mark Replied</button>
                  )}
                  {item.draft_message && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        const text = item.draft_message
                        navigator.clipboard.writeText(text).catch(() => {})
                      }}
                    >
                      Copy
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Outreach({ addToast }) {
  const [items, setItems] = useState([])
  const [stats, setStats] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const [outRes, statsRes] = await Promise.all([
        fetch('/api/outreach').then(r => r.json()),
        fetch('/api/outreach/stats').then(r => r.json()),
      ])
      setItems(Array.isArray(outRes) ? outRes : (outRes.items || []))
      setStats(statsRes)
    } catch {
      addToast('Failed to load outreach data.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const markSent = async (id) => {
    try {
      await fetch(`/api/outreach/${id}/mark-sent`, { method: 'POST' })
      addToast('Marked as sent.', 'success')
      load()
    } catch {
      addToast('Could not update status.', 'error')
    }
  }

  const markReplied = async (id) => {
    try {
      await fetch(`/api/outreach/${id}/mark-replied`, { method: 'POST' })
      addToast('Marked as replied.', 'success')
      load()
    } catch {
      addToast('Could not update status.', 'error')
    }
  }

  const drafts = items.filter(i => i.status === 'draft')
  const sent = items.filter(i => i.status === 'sent')
  const replied = items.filter(i => i.status === 'replied')
  const followUpDue = sent.filter(i => daysSince(i.sent_at) >= 7).length

  if (loading) return (
    <div style={{ padding: 32, textAlign: 'center', paddingTop: 80 }}>
      <span className="spinner" />
    </div>
  )

  return (
    <div style={{ padding: 32, maxWidth: 720 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>Outreach</h1>
          {stats && stats.total > 0 && (
            <div style={{ color: 'var(--text-2)', fontSize: 14 }}>
              {stats.sent} sent · {stats.replied} replied · {stats.replyRate || 0}% reply rate
            </div>
          )}
        </div>
        <button className="btn" onClick={() => setShowModal(true)}>+ New Outreach</button>
      </div>

      {items.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📨</div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>No outreach yet</div>
          <div style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 20 }}>
            Find recruiters at target companies and send personalized cold outreach.
          </div>
          <button className="btn" onClick={() => setShowModal(true)}>+ New Outreach</button>
        </div>
      ) : (
        <>
          <OutreachGroup
            title={`Draft (${drafts.length})`}
            items={drafts}
            onMarkSent={markSent}
            onMarkReplied={markReplied}
            followUpDue={0}
          />
          <OutreachGroup
            title={`Sent (${sent.length})`}
            items={sent}
            onMarkSent={markSent}
            onMarkReplied={markReplied}
            followUpDue={followUpDue}
          />
          <OutreachGroup
            title={`Replied (${replied.length})`}
            items={replied}
            onMarkSent={markSent}
            onMarkReplied={markReplied}
            followUpDue={0}
          />
        </>
      )}

      {showModal && (
        <OutreachModal
          onClose={() => setShowModal(false)}
          addToast={addToast}
          onSaved={load}
        />
      )}
    </div>
  )
}
