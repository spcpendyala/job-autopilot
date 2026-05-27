import { useState, useEffect } from 'react'
import { api, daysAgo } from '../lib/api'
import { useToast } from '../components/Toast'
import Spinner from '../components/Spinner'
import Modal from '../components/Modal'

const TYPE_META = {
  interview:           { emoji: '🎯', border: 'var(--green)',  badgeClass: 'badge-green',  label: 'Interview' },
  rejection:           { emoji: '❌', border: 'var(--red)',    badgeClass: 'badge-red',    label: 'Rejection' },
  reply:               { emoji: '📩', border: 'var(--blue)',   badgeClass: 'badge-blue',   label: 'Reply' },
  offer:               { emoji: '🎉', border: 'var(--green)',  badgeClass: 'badge-green',  label: 'Offer' },
  follow_up_request:   { emoji: '⚡', border: 'var(--yellow)', badgeClass: 'badge-yellow', label: 'Follow-up' },
  unknown:             { emoji: '📧', border: 'var(--border)', badgeClass: 'badge-grey',   label: 'Unknown' },
}

const TABS = ['All', 'Interviews', 'Rejections', 'Replies', 'Follow-up Needed', 'Unknown']
const TAB_TYPES = {
  'Interviews': 'interview',
  'Rejections': 'rejection',
  'Replies': 'reply',
  'Follow-up Needed': 'follow_up_request',
  'Unknown': 'unknown',
}

function groupByDate(msgs) {
  const groups = { Today: [], Yesterday: [], 'This Week': [], Older: [] }
  const now = Date.now()
  const day = 86400000
  msgs.forEach(m => {
    const ts = new Date(m.received_at || m.created_at || 0).getTime()
    const diff = now - ts
    if (diff < day) groups.Today.push(m)
    else if (diff < 2 * day) groups.Yesterday.push(m)
    else if (diff < 7 * day) groups['This Week'].push(m)
    else groups.Older.push(m)
  })
  return groups
}

function MessageCard({ msg, onAction, onView, navigate }) {
  const { toast } = useToast()
  const meta = TYPE_META[msg.type] || TYPE_META.unknown
  const [actioning, setActioning] = useState(false)

  const action = async (act) => {
    setActioning(true)
    await api(`/api/inbox/${msg.id}/action`, {
      method: 'POST',
      body: JSON.stringify({ action: act }),
    }).catch(() => {})
    toast(act === 'archived' ? 'Logged & closed' : 'Marked as done')
    onAction(msg.id, act)
    setActioning(false)
  }

  const logAndClose = async () => {
    await api(`/api/applications/${msg.application_id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'rejected' }),
    }).catch(() => {})
    await action('archived')
    toast('Application marked as rejected')
  }

  return (
    <div style={{
      display: 'flex', gap: 12, padding: 14,
      background: 'var(--card)', borderRadius: 'var(--radius-sm)',
      borderLeft: `3px solid ${meta.border}`,
      opacity: msg.actioned ? 0.5 : 1,
      marginBottom: 8,
    }}>
      <span style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>{meta.emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
          <div>
            <span className={`badge ${meta.badgeClass}`} style={{ fontSize: 10, marginRight: 6 }}>{meta.label}</span>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{msg.from_name || msg.from_email}</span>
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-3)', flexShrink: 0 }}>{daysAgo(msg.received_at)}</span>
        </div>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{msg.subject}</div>
        {msg.matched_company && (
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>
            Re: {msg.matched_role} at {msg.matched_company}
          </div>
        )}
        {msg.preview && !msg.actioned && (
          <div style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic', marginBottom: 8 }}>
            {msg.preview.slice(0, 100)}
          </div>
        )}
        {msg.actioned ? (
          <span style={{ fontSize: 12, color: 'var(--green)' }}>✓ Done</span>
        ) : (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => onView(msg)}>View Email</button>
            {msg.type === 'interview' && (
              <button className="btn btn-primary btn-sm" onClick={() => action('actioned')} disabled={actioning}>
                {actioning ? '...' : 'Mark as Actioned'}
              </button>
            )}
            {msg.type === 'rejection' && (
              <button className="btn btn-ghost btn-sm" onClick={logAndClose} disabled={actioning}>
                Log & Close
              </button>
            )}
            {msg.type === 'offer' && (
              <button className="btn btn-primary btn-sm" onClick={() => onView(msg)}>View Offer 🎉</button>
            )}
            {(msg.type === 'reply' || msg.type === 'unknown' || msg.type === 'follow_up_request') && (
              <button className="btn btn-ghost btn-sm" onClick={() => action('actioned')} disabled={actioning}>
                Mark as Read
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Inbox({ navigate, user }) {
  const { toast } = useToast()
  const [messages, setMessages] = useState([])
  const [gmailStatus, setGmailStatus] = useState({ connected: false, lastSync: null })
  const [activeTab, setActiveTab] = useState('All')
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [viewMsg, setViewMsg] = useState(null)

  const fetchAll = async () => {
    try {
      const [statusRes, msgsRes] = await Promise.allSettled([
        api('/api/inbox/gmail-status'),
        api('/api/inbox/messages'),
      ])
      if (statusRes.status === 'fulfilled') setGmailStatus(statusRes.value || { connected: false, lastSync: null })
      if (msgsRes.status === 'fulfilled') setMessages(Array.isArray(msgsRes.value) ? msgsRes.value : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const sync = async () => {
    setSyncing(true)
    await api('/api/inbox/sync', { method: 'POST' }).catch(() => {})
    toast('Sync started — refresh in ~30 seconds')
    setTimeout(() => { fetchAll(); setSyncing(false) }, 5000)
  }

  const handleAction = (id, act) => {
    setMessages(msgs => msgs.map(m => m.id === id ? { ...m, actioned: true } : m))
  }

  const filteredMsgs = activeTab === 'All'
    ? messages
    : messages.filter(m => m.type === TAB_TYPES[activeTab])

  const tabCount = (tab) => {
    if (tab === 'All') return messages.filter(m => !m.actioned).length
    return messages.filter(m => m.type === TAB_TYPES[tab] && !m.actioned).length
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <Spinner size={28} />
    </div>
  )

  return (
    <div style={{ padding: '20px 20px 60px', maxWidth: 800 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Inbox 📩</h1>
          <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Job-related emails, auto-classified and ready to action.</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <button className="btn btn-ghost btn-sm" onClick={sync} disabled={syncing}>
            {syncing ? <><Spinner size={12} /> Syncing...</> : '🔄 Sync Now'}
          </button>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
            {gmailStatus.lastSync ? `Last synced: ${daysAgo(gmailStatus.lastSync)}` : 'Never synced'}
          </div>
        </div>
      </div>

      {/* Not connected */}
      {!gmailStatus.connected && (
        <div style={{ textAlign: 'center', padding: '48px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📩</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Connect Gmail to monitor your inbox</h2>
          <p style={{ color: 'var(--text-3)', fontSize: 14, marginBottom: 24, maxWidth: 420, margin: '0 auto 24px' }}>
            We'll automatically find and classify job-related emails — interview invites, rejections, follow-up requests.
          </p>
          <a href="/auth/google/gmail" className="btn btn-primary">Connect Gmail →</a>
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
            {['Only reads job-related emails', 'Never sends emails on your behalf without approval', 'You can disconnect anytime in Settings'].map(f => (
              <div key={f} style={{ fontSize: 13, color: 'var(--text-3)' }}>✓ {f}</div>
            ))}
          </div>
        </div>
      )}

      {/* Connected state */}
      {gmailStatus.connected && (
        <>
          {/* Type filter tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
            {TABS.map(tab => {
              const count = tabCount(tab)
              return (
                <button key={tab} className="btn btn-ghost btn-sm"
                  style={{
                    borderBottom: activeTab === tab ? '2px solid var(--green)' : '2px solid transparent',
                    borderRadius: 0, color: activeTab === tab ? 'var(--green)' : 'var(--text-3)',
                    whiteSpace: 'nowrap',
                  }}
                  onClick={() => setActiveTab(tab)}>
                  {tab}{count > 0 ? ` (${count})` : ''}
                </button>
              )
            })}
          </div>

          {/* Messages */}
          {filteredMsgs.length === 0 ? (
            messages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>No job emails found yet</div>
                <div style={{ color: 'var(--text-3)', fontSize: 13, marginBottom: 16 }}>
                  Sync your inbox or wait — we check for new emails every hour
                </div>
                <button className="btn btn-primary btn-sm" onClick={sync}>Sync Now</button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>You're all caught up!</div>
                <div style={{ color: 'var(--text-3)', fontSize: 13, marginBottom: 16 }}>
                  New replies will appear here automatically after each sync.
                </div>
                <button className="btn btn-ghost btn-sm" onClick={sync}>Sync Now</button>
              </div>
            )
          ) : (
            (() => {
              const groups = groupByDate(filteredMsgs)
              return Object.entries(groups).map(([label, msgs]) => {
                if (msgs.length === 0) return null
                return (
                  <div key={label} style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 10 }}>
                      {label}
                    </div>
                    {msgs.map(m => (
                      <MessageCard key={m.id} msg={m} onAction={handleAction} onView={setViewMsg} navigate={navigate} />
                    ))}
                  </div>
                )
              })
            })()
          )}
        </>
      )}

      {/* Email preview modal */}
      {viewMsg && (
        <Modal open={true} title={`Email from ${viewMsg.from_name || viewMsg.from_email}`} onClose={() => setViewMsg(null)}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>
              From: {viewMsg.from_name} {viewMsg.from_email ? `<${viewMsg.from_email}>` : ''}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{viewMsg.subject}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{daysAgo(viewMsg.received_at)}</div>
          </div>
          {viewMsg.matched_company && (
            <div style={{ padding: '10px 14px', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', marginBottom: 12, fontSize: 13 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span className={`badge ${(TYPE_META[viewMsg.type] || TYPE_META.unknown).badgeClass}`}>
                  {(TYPE_META[viewMsg.type] || TYPE_META.unknown).label}
                </span>
                {viewMsg.confidence != null && viewMsg.confidence < 70 && (
                  <span style={{ fontSize: 11, color: 'var(--yellow)' }}>⚠️ Low confidence — please verify</span>
                )}
              </div>
              Matched to: {viewMsg.matched_role} at {viewMsg.matched_company}
            </div>
          )}
          <pre style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', padding: 14, fontSize: 12,
            fontFamily: 'var(--mono)', overflowY: 'auto', maxHeight: 300,
            whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--text-2)',
          }}>
            {viewMsg.body || viewMsg.preview || '(No content)'}
          </pre>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            {viewMsg.type === 'rejection' && (
              <button className="btn btn-ghost btn-sm" onClick={async () => {
                await api(`/api/inbox/${viewMsg.id}/action`, { method: 'POST', body: JSON.stringify({ action: 'archived' }) }).catch(() => {})
                toast('Marked as rejected')
                handleAction(viewMsg.id, 'archived')
                setViewMsg(null)
              }}>Log & Close</button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={async () => {
              await api(`/api/inbox/${viewMsg.id}/action`, { method: 'POST', body: JSON.stringify({ action: 'actioned' }) }).catch(() => {})
              handleAction(viewMsg.id, 'actioned')
              setViewMsg(null)
            }}>Mark as Read</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
