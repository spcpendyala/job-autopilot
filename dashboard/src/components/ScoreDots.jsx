import { scoreColor } from '../lib/api'

export default function ScoreDots({ score, size = 8, showNumber = true }) {
  const filled = Math.round((score || 0) / 2)
  const color = scoreColor(score)
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{
          width: size, height: size, borderRadius: '50%', flexShrink: 0,
          background: i <= filled ? color : 'var(--border-hi)',
        }} />
      ))}
      {showNumber && score && (
        <span style={{ marginLeft: 6, fontSize: 13, fontWeight: 600, color }}>
          {Number(score).toFixed(1)}
        </span>
      )}
    </span>
  )
}
