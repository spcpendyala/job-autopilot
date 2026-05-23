import { useState, useEffect } from 'react'

export default function AuthGate({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [multiUser, setMultiUser] = useState(false)

  useEffect(() => {
    fetch('/auth/me')
      .then(r => r.json())
      .then(d => {
        setUser(d.user || null)
        // If server returned 401 with loginUrl, we're in multi-user mode
        if (d.loginUrl) setMultiUser(true)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
        <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
      </div>
    )
  }

  // Single-user mode: no auth needed (server returns userId='default')
  if (!multiUser) return children

  // Multi-user mode but authenticated
  if (user) return children

  // Multi-user mode, not authenticated — show login screen
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 48, maxWidth: 400, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 20 }}>🚀</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 10 }}>Job AutoPilot</h1>
        <p style={{ color: 'var(--text-2)', fontSize: 15, marginBottom: 32, lineHeight: 1.6 }}>
          Your AI-powered job search co-pilot
        </p>
        <a
          href="/auth/google"
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            background: '#fff', color: '#1f1f1f', borderRadius: 'var(--radius-sm)',
            padding: '12px 24px', fontWeight: 600, fontSize: 15, textDecoration: 'none',
            width: '100%', boxSizing: 'border-box',
            border: '1px solid #e5e7eb',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.8-6.8C35.6 2.2 30.1 0 24 0 14.7 0 6.7 5.4 2.9 13.3l7.9 6.1C12.6 13 17.9 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.1z"/>
            <path fill="#FBBC05" d="M10.8 28.6A14.6 14.6 0 019.5 24c0-1.6.3-3.2.7-4.6L2.3 13.3A23.9 23.9 0 000 24c0 3.8.9 7.4 2.5 10.6l8.3-6z"/>
            <path fill="#34A853" d="M24 48c6.1 0 11.2-2 14.9-5.5l-7.6-5.9c-2 1.4-4.5 2.2-7.3 2.2-6.1 0-11.3-4.1-13.2-9.6l-8.3 6C6.7 42.6 14.7 48 24 48z"/>
          </svg>
          Sign in with Google
        </a>
      </div>
    </div>
  )
}
