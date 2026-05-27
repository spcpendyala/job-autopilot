export default function EmptyState({ icon, title, subtitle, action, onAction, loading }) {
  return (
    <div style={{ textAlign: 'center', padding: '28px 16px', color: 'var(--text-2)' }}>
      {icon && <div style={{ fontSize: 28, marginBottom: 10 }}>{icon}</div>}
      <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 6, fontSize: 14 }}>{title}</div>
      {subtitle && (
        <div style={{
          fontSize: 13, color: 'var(--text-2)', maxWidth: 300,
          margin: action ? '0 auto' : '0 auto', lineHeight: 1.6,
        }}>
          {subtitle}
        </div>
      )}
      {action && onAction && (
        <button className="btn btn-primary btn-sm" onClick={onAction}
                disabled={loading} style={{ marginTop: 14 }}>
          {loading ? 'Loading...' : action}
        </button>
      )}
    </div>
  )
}
