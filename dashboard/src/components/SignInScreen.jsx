export default function SignInScreen() {
  const features = [
    { icon: '🔍', title: 'Finds matching jobs',
      desc: 'Scans job boards every morning based on your skills and target roles.' },
    { icon: '✍️', title: 'Tailors every application',
      desc: 'AI rewrites your resume and cover letter per job in seconds.' },
    { icon: '📋', title: 'Tracks everything',
      desc: 'See every application, follow-up reminder, and response in one place.' },
    { icon: '📩', title: 'Monitors your inbox',
      desc: 'Auto-classifies replies: interview invites, rejections, and follow-ups.' },
    { icon: '💼', title: 'Freelance & full-time',
      desc: 'Handles Upwork, Fiverr, Freelancer, and traditional job boards.' },
    { icon: '📊', title: 'Analytics & insights',
      desc: 'Track response rate, time-to-reply, and what is working.' },
  ]

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)', display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '32px 16px',
    }}>
      <div style={{ marginBottom: 12, fontSize: 52 }}>🚀</div>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Job AutoPilot</h1>
      <p style={{
        fontSize: 16, color: 'var(--text-2)', textAlign: 'center',
        maxWidth: 440, marginBottom: 40, lineHeight: 1.6,
      }}>
        Your AI co-pilot for the job search. Find better-fit jobs, apply faster,
        and never lose track of where you stand.
      </p>

      <div className="card" style={{ width: '100%', maxWidth: 360, padding: 28, marginBottom: 36 }}>
        <div style={{ marginBottom: 18, textAlign: 'center', fontSize: 13, color: 'var(--text-2)' }}>
          Sign in to get started — takes about 3 minutes to set up
        </div>
        <a href="/auth/google" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
          width: '100%', padding: '13px 20px', background: '#fff', color: '#111',
          borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: 15,
          textDecoration: 'none',
        }}>
          <svg width="20" height="20" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.17z"/>
            <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z"/>
            <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z"/>
            <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.31z"/>
          </svg>
          Continue with Google
        </a>
        <p style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'center', marginTop: 14, lineHeight: 1.5 }}>
          Your data is private. We never share your profile or applications.
        </p>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10,
        maxWidth: 620, width: '100%',
      }}>
        {features.map(f => (
          <div key={f.title} className="card" style={{ padding: '16px 14px' }}>
            <div style={{ fontSize: 22, marginBottom: 7 }}>{f.icon}</div>
            <div style={{ fontWeight: 600, marginBottom: 5, fontSize: 13 }}>{f.title}</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>{f.desc}</div>
          </div>
        ))}
      </div>

      <p style={{ marginTop: 32, fontSize: 11, color: 'var(--text-3)' }}>
        Works with: LinkedIn · Indeed · Upwork · Fiverr · Freelancer · Remote OK
      </p>
      <p style={{ marginTop: 12, fontSize: 11, color: 'var(--text-3)' }}>
        <a href="/privacy" style={{ color: 'var(--text-3)' }}>Privacy Policy</a>
        {' · '}
        <a href="/terms" style={{ color: 'var(--text-3)' }}>Terms of Service</a>
      </p>
    </div>
  )
}
