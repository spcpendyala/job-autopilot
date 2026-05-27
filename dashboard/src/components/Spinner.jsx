export default function Spinner({ size = 18, color = 'var(--text-2)' }) {
  return (
    <span className="spin" style={{
      display: 'inline-block', width: size, height: size, flexShrink: 0,
      border: `2px solid ${color}30`, borderTopColor: color, borderRadius: '50%',
    }} />
  )
}
