import { useState, useEffect } from 'react'

export default function AuthGate({ children }) {
  const [status, setStatus] = useState('loading') // 'loading' | 'authenticated' | 'unauthenticated'

  useEffect(() => {
    fetch('/auth/me')
      .then(r => {
        if (!r.ok) { setStatus('unauthenticated'); return }
        return r.json().then(d => {
          setStatus(d.user ? 'authenticated' : 'unauthenticated')
        })
      })
      .catch(() => setStatus('unauthenticated'))
  }, [])

  if (status === 'loading') {
    return <div style={{ background: '#080808', height: '100vh' }} />
  }

  if (status === 'authenticated') {
    return children
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#080808' }}>
      <div style={{ background: '#111', border: '1px solid #222', borderRadius: 16, padding: 48, maxWidth: 400, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 52, marginBottom: 20 }}>🚀</div>
        <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 10, color: '#f0f0f0' }}>Job AutoPilot</h1>
        <p style={{ color: '#999', fontSize: 15, marginBottom: 36, lineHeight: 1.6 }}>
          Your AI-powered job search co-pilot
        </p>
        <a
          href="/auth/google"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#22c55e', color: '#fff', borderRadius: 8,
            padding: '13px 24px', fontWeight: 600, fontSize: 15,
            textDecoration: 'none', width: '100%', boxSizing: 'border-box',
          }}
        >
          Sign in with Google
        </a>
      </div>
    </div>
  )
}
