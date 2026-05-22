const TYPE_STYLES = {
  success: { bg: '#14332a', border: '#22c55e', color: '#22c55e' },
  error:   { bg: '#3d1515', border: '#ef4444', color: '#ef4444' },
  warning: { bg: '#3d2e00', border: '#eab308', color: '#eab308' },
}

export default function Toast({ toasts, removeToast }) {
  if (!toasts.length) return null

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.slice(-3).map(toast => {
        const s = TYPE_STYLES[toast.type] || TYPE_STYLES.success
        return (
          <div
            key={toast.id}
            style={{
              background: s.bg,
              border: `1px solid ${s.border}`,
              borderRadius: 8,
              color: s.color,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              minWidth: 280,
              maxWidth: 400,
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            <span style={{ flex: 1 }}>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              style={{ background: 'none', border: 'none', color: s.color, cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 2px', opacity: 0.7 }}
            >
              ×
            </button>
          </div>
        )
      })}
    </div>
  )
}
