import { useState, useEffect } from 'react'
import { api, daysAgo } from '../lib/api'
import Spinner from './Spinner'

export default function MarketIntel({ targetRoles }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api('/api/market-intelligence')
      .then(d => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
      <Spinner size={16} />
    </div>
  )

  if (!data || !data.lastUpdated) return (
    <div className="card" style={{ padding: 16, color: 'var(--text-3)', fontSize: 13 }}>
      📊 Market Intelligence not available yet — runs after first discovery
    </div>
  )

  const demandConfig = {
    high: { dot: '🟢', text: 'High demand — lots of active listings' },
    medium: { dot: '🟡', text: 'Moderate — normal market activity' },
    low: { dot: '🔴', text: 'Low demand — competitive market' },
  }

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>📊 Market Pulse</span>
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Updated {daysAgo(data.lastUpdated)}</span>
      </div>

      {data.trendingSkills?.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>
            Hot Right Now
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {data.trendingSkills.slice(0, 6).map((skill, i) => (
              <span key={i} className="tag-chip" style={{ fontSize: 11 }}>
                {skill.name || skill} {skill.trending && '🔥'}
              </span>
            ))}
          </div>
        </div>
      )}

      {data.salaryRange && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 6 }}>
            Typical Range
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--green)' }}>
            {data.salaryRange.currency || '$'}{data.salaryRange.min}k – {data.salaryRange.currency || '$'}{data.salaryRange.max}k
          </div>
          {targetRoles?.[0] && (
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>For: {targetRoles[0]}</div>
          )}
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>Based on recent job postings</div>
        </div>
      )}

      {data.demandSignal && demandConfig[data.demandSignal] && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 6 }}>
            Demand
          </div>
          <div style={{ fontSize: 13 }}>
            {demandConfig[data.demandSignal].dot} {demandConfig[data.demandSignal].text}
          </div>
        </div>
      )}

      {data.topCompanies?.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>
            Actively Hiring
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {data.topCompanies.slice(0, 4).map((c, i) => (
              <span key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: 4, fontSize: 11, color: 'var(--text-3)' }}>
                {c}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
