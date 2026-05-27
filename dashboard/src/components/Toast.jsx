import { useState, useCallback, createContext, useContext } from 'react'

// ── New context-based API (used by Phase 3+ App) ────────────────────────────
const ToastCtx = createContext(null)
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const toast = useCallback((msg, type = 'success') => {
    const id = Date.now() + Math.random()
    setToasts(t => [...t.slice(-2), { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }, [])

  const colors = {
    success: 'var(--green)',
    error:   'var(--red)',
    info:    'var(--blue)',
    warning: 'var(--yellow)',
  }

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div style={{
        position: 'fixed', bottom: 72, right: 16, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none',
      }}>
        {toasts.map(t => (
          <div key={t.id} className="fadein" style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderLeft: `3px solid ${colors[t.type] || colors.info}`,
            borderRadius: 'var(--radius-sm)', padding: '10px 16px',
            fontSize: 13, maxWidth: 300, boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            pointerEvents: 'all',
          }}>{t.msg}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

// ── Legacy prop-based API (used by existing App.jsx) ────────────────────────
const TYPE_STYLES = {
  success: { bg: '#14332a', border: '#22c55e', color: '#22c55e' },
  error:   { bg: '#3d1515', border: '#ef4444', color: '#ef4444' },
  warning: { bg: '#3d2e00', border: '#eab308', color: '#eab308' },
}

export default function Toast({ toasts = [], removeToast = () => {} }) {
  if (!toasts.length) return null
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.slice(-3).map(toast => {
        const s = TYPE_STYLES[toast.type] || TYPE_STYLES.success
        return (
          <div key={toast.id} style={{
            background: s.bg, border: `1px solid ${s.border}`,
            borderRadius: 8, color: s.color,
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 16px', minWidth: 280, maxWidth: 400,
            fontSize: 13, fontWeight: 500,
          }}>
            <span style={{ flex: 1 }}>{toast.message}</span>
            <button onClick={() => removeToast(toast.id)} style={{
              background: 'none', border: 'none', color: s.color,
              cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 2px', opacity: 0.7,
            }}>×</button>
          </div>
        )
      })}
    </div>
  )
}
