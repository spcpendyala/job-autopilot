import { useState, useEffect } from 'react'
import { api, daysAgo, copyToClipboard } from '../lib/api'
import { useToast } from '../components/Toast'
import Spinner from '../components/Spinner'
import EmptyState from '../components/EmptyState'

const PLATFORM_COLORS = {
  upwork: 'badge-purple',
  fiverr: 'badge-blue',
  freelancer: 'badge-grey',
  peopleperhour: 'badge-grey',
}

function StatCard({ label, value, color }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '16px 12px' }}>
      <div style={{ fontSize: 28, fontWeight: 800, color: color || 'var(--text)', lineHeight: 1, marginBottom: 6 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-3)' }}>
        {label}
      </div>
    </div>
  )
}

function ProposalEditor({ gig, profileHourlyRate, onMarkSent, onClose }) {
  const { toast } = useToast()
  const [proposal, setProposal] = useState('')
  const [bidAmount, setBidAmount] = useState(profileHourlyRate || '')
  const [bidType, setBidType] = useState('hourly')
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [marking, setMarking] = useState(false)

  useEffect(() => {
    generate()
  }, [])

  const generate = async () => {
    setGenerating(true)
    try {
      const d = await api(`/api/freelance/gigs/${gig.id}/propose`, {
        method: 'POST',
        body: JSON.stringify({ hourlyRate: bidAmount }),
      })
      setProposal(d.proposal || '')
    } catch {
      setProposal('Unable to generate proposal at this time.')
    } finally {
      setGenerating(false)
    }
  }

  const copy = async () => {
    await copyToClipboard(proposal)
    setCopied(true)
    toast(`Copied! Paste into ${gig.platform || 'the platform'}`)
    setTimeout(() => setCopied(false), 2000)
  }

  const markSent = async () => {
    setMarking(true)
    try {
      await api(`/api/freelance/proposals/${gig.id}/mark-sent`, {
        method: 'POST',
        body: JSON.stringify({ bidAmount, bidType, proposalText: proposal, platform: gig.platform }),
      })
      toast('Proposal recorded ✓ — good luck!')
      onMarkSent()
    } catch {
      toast('Failed to record proposal')
    } finally {
      setMarking(false)
    }
  }

  return (
    <div style={{ marginTop: 12, padding: 14, background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
      {generating ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-3)', fontSize: 13 }}>
          <Spinner size={14} /> Writing proposal... (~15s)
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-3)' }}>$</span>
            <input
              className="input"
              style={{ width: 90 }}
              type="number"
              value={bidAmount}
              onChange={e => setBidAmount(e.target.value)}
              placeholder="Rate"
            />
            <div style={{ display: 'flex', gap: 4 }}>
              {['hourly', 'fixed'].map(t => (
                <button key={t} className={`btn btn-sm ${bidType === t ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setBidType(t)}>
                  {t === 'hourly' ? 'Hourly' : 'Fixed Price'}
                </button>
              ))}
            </div>
          </div>

          <textarea
            className="input"
            style={{ width: '100%', minHeight: 160, fontFamily: 'var(--mono)', fontSize: 12, resize: 'vertical', marginBottom: 6 }}
            value={proposal}
            onChange={e => setProposal(e.target.value)}
          />
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 10 }}>
            {proposal.length} / 1500 characters
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button className="btn btn-ghost btn-sm" onClick={generate}>Regenerate</button>
            <button className="btn btn-ghost btn-sm" onClick={copy}>
              {copied ? 'Copied! ✓' : 'Copy to Clipboard'}
            </button>
            {gig.url && (
              <button className="btn btn-ghost btn-sm" onClick={() => window.open(gig.url, '_blank')}>
                Open {gig.platform} ↗
              </button>
            )}
            <button className="btn btn-sm" style={{ background: 'var(--purple-dim)', color: 'var(--purple)' }}
              onClick={markSent} disabled={marking}>
              {marking ? 'Saving...' : 'Mark as Sent →'}
            </button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8 }}>
            After copying, paste the proposal into {gig.platform || 'the platform'}
          </div>
        </>
      )}
    </div>
  )
}

function GigCard({ gig, profileHourlyRate, onSkip, onSent }) {
  const { toast } = useToast()
  const [expanded, setExpanded] = useState(false)
  const [skipping, setSkipping] = useState(false)

  const skip = async () => {
    setSkipping(true)
    await api(`/api/freelance/gigs/${gig.id}/skip`, { method: 'POST' }).catch(() => {})
    toast('Skipped')
    onSkip(gig.id)
  }

  const platform = (gig.platform || 'other').toLowerCase()
  const badgeClass = PLATFORM_COLORS[platform] || 'badge-grey'

  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span className={`badge ${badgeClass}`} style={{ fontSize: 10, textTransform: 'capitalize' }}>
              {gig.platform || 'Other'}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{daysAgo(gig.created_at)}</span>
          </div>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{gig.title}</div>
          {gig.budget && (
            <div style={{ fontSize: 13, color: 'var(--green)', fontWeight: 600 }}>{gig.budget}</div>
          )}
          {gig.description && (
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>
              {gig.description.slice(0, 120)}{gig.description.length > 120 ? '...' : ''}
            </div>
          )}
        </div>
      </div>

      {!expanded && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={skip} disabled={skipping}>Skip</button>
          <button className="btn btn-sm" style={{ flex: 1, justifyContent: 'center', background: 'var(--purple-dim)', color: 'var(--purple)' }}
            onClick={() => setExpanded(true)}>
            Write Proposal →
          </button>
        </div>
      )}

      {expanded && (
        <ProposalEditor
          gig={gig}
          profileHourlyRate={profileHourlyRate}
          onMarkSent={() => { setExpanded(false); onSent(gig.id) }}
          onClose={() => setExpanded(false)}
        />
      )}
    </div>
  )
}

function ProposalCard({ proposal, onStatusUpdate }) {
  const { toast } = useToast()
  const [updating, setUpdating] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)

  const updateStatus = async (status) => {
    setUpdating(true)
    setShowDropdown(false)
    await api(`/api/freelance/proposals/${proposal.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }).catch(() => {})
    toast(`Status updated to ${status}`)
    onStatusUpdate()
    setUpdating(false)
  }

  const copyFollowup = async () => {
    const text = `Hi [Name], I wanted to follow up on my proposal for ${proposal.gig_title || 'your project'}.\nI'm still very interested and available to start immediately.\nPlease let me know if you have any questions about my approach.\nBest, [Your Name]`
    await copyToClipboard(text)
    toast('Follow-up message copied!')
  }

  const statusBadge = {
    pending: { cls: 'badge-yellow', label: 'Awaiting Response' },
    viewed: { cls: 'badge-blue', label: 'Viewed by client' },
    interview: { cls: 'badge-green', label: 'Interview / Discussion' },
    won: { cls: 'badge-green', label: 'Won 🎉' },
    lost: { cls: 'badge-grey', label: 'Not selected' },
  }[proposal.status] || { cls: 'badge-grey', label: proposal.status }

  const daysPending = proposal.sent_at
    ? Math.floor((Date.now() - new Date(proposal.sent_at).getTime()) / 86400000)
    : 0
  const followupDue = proposal.status === 'pending' && daysPending > 5

  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span className={`badge ${PLATFORM_COLORS[(proposal.platform || '').toLowerCase()] || 'badge-grey'}`} style={{ fontSize: 10, textTransform: 'capitalize' }}>
              {proposal.platform || 'Other'}
            </span>
            <span className={`badge ${statusBadge.cls}`} style={{ fontSize: 10 }}>{statusBadge.label}</span>
            {proposal.sent_at && (
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Sent {daysAgo(proposal.sent_at)}</span>
            )}
          </div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{proposal.gig_title || 'Freelance Proposal'}</div>
          {proposal.bid_amount && (
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>${proposal.bid_amount}</div>
          )}
        </div>
        {proposal.status !== 'won' && proposal.status !== 'lost' && (
          <div style={{ position: 'relative' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowDropdown(d => !d)}>
              Update Status ▾
            </button>
            {showDropdown && (
              <div style={{
                position: 'absolute', right: 0, top: '100%', marginTop: 4,
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)', zIndex: 100, minWidth: 160,
              }}>
                {['viewed', 'interview', 'won', 'lost'].map(s => (
                  <button key={s} style={{
                    display: 'block', width: '100%', padding: '8px 14px', textAlign: 'left',
                    background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer',
                    fontSize: 13,
                  }} onClick={() => updateStatus(s)}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {followupDue && (
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--yellow)' }}>Follow-up due</span>
          <button className="btn btn-ghost btn-sm" onClick={copyFollowup}>Copy Follow-up Message</button>
        </div>
      )}
      {proposal.status === 'interview' && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button className="btn btn-primary btn-sm" onClick={() => updateStatus('won')}>Won It! 🎉</button>
          <button className="btn btn-ghost btn-sm" onClick={() => updateStatus('lost')}>Not This Time</button>
        </div>
      )}
    </div>
  )
}

const TABS = ['All', 'Upwork', 'Fiverr', 'Freelancer', 'PeoplePerHour']

export default function Freelance({ navigate, user }) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('All')
  const [gigs, setGigs] = useState([])
  const [proposals, setProposals] = useState([])
  const [stats, setStats] = useState({ total: 0, won: 0, rate: 0, pending: 0 })
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchAll = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try {
      const [gigsRes, proposalsRes, statsRes, profileRes] = await Promise.allSettled([
        api('/api/freelance/gigs?status=discovered&limit=20'),
        api('/api/freelance/proposals'),
        api('/api/freelance/stats'),
        api('/api/profile'),
      ])
      setGigs(gigsRes.status === 'fulfilled' && Array.isArray(gigsRes.value) ? gigsRes.value : [])
      setProposals(proposalsRes.status === 'fulfilled' && Array.isArray(proposalsRes.value) ? proposalsRes.value : [])
      setStats(statsRes.status === 'fulfilled' ? (statsRes.value || { total: 0, won: 0, rate: 0, pending: 0 }) : { total: 0, won: 0, rate: 0, pending: 0 })
      setProfile(profileRes.status === 'fulfilled' ? profileRes.value : null)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const filterByTab = (items) => {
    if (activeTab === 'All') return items
    return items.filter(i => (i.platform || '').toLowerCase() === activeTab.toLowerCase())
  }

  const filteredGigs = filterByTab(gigs)
  const filteredProposals = filterByTab(proposals)

  const missingProfile = !profile?.hourlyRate || !profile?.freelanceBio

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
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Freelance 💼</h1>
          <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Proposals, bids, and gig opportunities — all in one place.</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => fetchAll(true)} disabled={refreshing}>
          {refreshing ? <Spinner size={12} /> : '⟳ Refresh'}
        </button>
      </div>

      {/* Missing profile banner */}
      {missingProfile && (
        <div style={{
          marginBottom: 16, padding: '12px 16px',
          background: 'rgba(234,179,8,0.08)', borderLeft: '3px solid var(--yellow)',
          borderRadius: 'var(--radius-sm)', fontSize: 13,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span>⚡ Complete your freelance profile — add your hourly rate and bio for better proposals</span>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('profile')}>Update Profile →</button>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
        <StatCard label="Proposals Sent" value={stats.total} color="var(--blue)" />
        <StatCard label="Won" value={stats.won} color="var(--green)" />
        <StatCard label="Win Rate" value={`${stats.rate}%`} color={stats.rate >= 20 ? 'var(--green)' : 'var(--yellow)'} />
        <StatCard label="Pending" value={stats.pending} color="var(--yellow)" />
      </div>

      {/* Platform tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
        {TABS.map(tab => (
          <button key={tab} className="btn btn-ghost btn-sm"
            style={{
              borderBottom: activeTab === tab ? '2px solid var(--green)' : '2px solid transparent',
              borderRadius: 0, color: activeTab === tab ? 'var(--green)' : 'var(--text-3)',
              whiteSpace: 'nowrap',
            }}
            onClick={() => setActiveTab(tab)}>
            {tab}
          </button>
        ))}
      </div>

      {/* New Gig Opportunities */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 12 }}>
          New Gig Opportunities
        </div>
        {filteredGigs.length === 0 ? (
          <EmptyState
            icon="🔭"
            title="No new gigs yet"
            subtitle="Freelance gigs appear here after discovery runs"
            action="Run Discovery Now"
            onAction={async () => {
              await api('/api/discover', { method: 'POST' }).catch(() => {})
              toast('Discovery started — check back in a minute')
            }}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredGigs.map(gig => (
              <GigCard
                key={gig.id}
                gig={gig}
                profileHourlyRate={profile?.hourlyRate}
                onSkip={id => setGigs(g => g.filter(x => x.id !== id))}
                onSent={id => {
                  setGigs(g => g.filter(x => x.id !== id))
                  fetchAll(true)
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Proposals Sent */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 12 }}>
          Proposals Sent
        </div>
        {filteredProposals.length === 0 ? (
          <div style={{ color: 'var(--text-3)', fontSize: 13 }}>
            📬 No proposals sent yet — write your first one above
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredProposals.map(p => (
              <ProposalCard key={p.id} proposal={p} onStatusUpdate={() => fetchAll(true)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
