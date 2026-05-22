import { useState, useEffect } from 'react'

const STATUS_COLORS = {
  discovered: '#888',
  applied: '#3b82f6',
  responded: '#eab308',
  interview: '#22c55e',
  'interview-prep-ready': '#22c55e',
  rejected: '#ef4444',
  offer: '#a855f7',
}

function DonutChart({ segments }) {
  const total = segments.reduce((s, d) => s + d.value, 0)
  if (!total) return <div style={{ color: '#888', padding: 24 }}>No data</div>

  const radius = 54
  const cx = 80, cy = 80
  const circ = 2 * Math.PI * radius
  let cumPct = 0
  const slices = segments.filter(s => s.value > 0).map(s => {
    const pct = s.value / total
    const slice = { ...s, pct, offset: cumPct }
    cumPct += pct
    return slice
  })

  return (
    <svg width={160} height={160} viewBox="0 0 160 160">
      {slices.map((s, i) => (
        <circle key={i} cx={cx} cy={cy} r={radius}
          fill="none"
          stroke={s.color}
          strokeWidth={24}
          strokeDasharray={`${s.pct * circ} ${circ}`}
          strokeDashoffset={-(s.offset * circ)}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      ))}
      <text x={cx} y={cy} textAnchor="middle" dy=".35em" fill="#f0f0f0" fontSize={22} fontWeight={700}>{total}</text>
    </svg>
  )
}

export default function Stats() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(setStats).catch(() => {})
  }, [])

  if (!stats) return <div className="empty"><span className="spinner" /></div>

  const segments = [
    { label: 'Discovered', value: stats.total - stats.applied - stats.responded - stats.interviews - stats.rejections - (stats.offers || 0), color: STATUS_COLORS.discovered },
    { label: 'Applied', value: stats.applied, color: STATUS_COLORS.applied },
    { label: 'Responded', value: stats.responded, color: STATUS_COLORS.responded },
    { label: 'Interview', value: stats.interviews, color: STATUS_COLORS.interview },
    { label: 'Rejected', value: stats.rejections, color: STATUS_COLORS.rejected },
    { label: 'Offer', value: stats.offers || 0, color: STATUS_COLORS.offer },
  ].filter(s => s.value > 0)

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="big-num" style={{ color: '#f0f0f0' }}>{stats.total}</div>
          <div className="big-label">Total Applications</div>
        </div>
        <div className="stat-card">
          <div className="big-num" style={{ color: stats.avgFitScore >= 8 ? '#22c55e' : stats.avgFitScore >= 6 ? '#eab308' : '#ef4444' }}>
            {stats.avgFitScore}
          </div>
          <div className="big-label">Avg Fit Score</div>
        </div>
        <div className="stat-card">
          <div className="big-num" style={{ color: '#3b82f6' }}>{stats.responseRate}</div>
          <div className="big-label">Response Rate</div>
        </div>
        <div className="stat-card">
          <div className="big-num" style={{ color: '#22c55e' }}>{stats.interviews}</div>
          <div className="big-label">Interviews</div>
        </div>
      </div>

      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 20 }}>Application Pipeline</div>
        <div className="chart-row">
          <DonutChart segments={segments} />
          <div className="legend">
            {segments.map((s, i) => (
              <div key={i} className="legend-item">
                <span className="legend-dot" style={{ background: s.color }} />
                <span style={{ color: '#d0d0d0' }}>{s.label}</span>
                <span style={{ color: '#888', marginLeft: 'auto', paddingLeft: 16 }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
