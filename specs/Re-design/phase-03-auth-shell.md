# PHASE 3 — UserContext + App Shell + Sign-In + Sidebar

## Goal
Auth state, app-level routing skeleton, sign-in screen for logged-out users,
and the sidebar navigation for logged-in users.

---

## Prompt for Claude Code

```
Phases 1 and 2 are complete. Foundation files and components exist.
Backend is running. Now wire up auth and the main shell.

Do not touch api/server.js, services/, agents/, or discovery/.
Only create/edit files inside dashboard/src/.

---

CREATE dashboard/src/UserContext.jsx:

import { createContext, useContext, useState, useEffect } from 'react'
import { api } from './lib/api'

const UserCtx = createContext(null)
export const useUser = () => useContext(UserCtx)

export function UserProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api('/auth/me')
      .then(d => {
        if (d) { setUser(d.user); setIsAdmin(!!d.isAdmin) }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <UserCtx.Provider value={{ user, isAdmin, loading, setUser }}>
      {children}
    </UserCtx.Provider>
  )
}


---

CREATE dashboard/src/components/SignInScreen.jsx:

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
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex',
                  flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  padding: '32px 16px' }}>
      <div style={{ marginBottom: 12, fontSize: 52 }}>🚀</div>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Job AutoPilot</h1>
      <p style={{ fontSize: 16, color: 'var(--text-2)', textAlign: 'center',
                  maxWidth: 440, marginBottom: 40, lineHeight: 1.6 }}>
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
          borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: 15
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10,
                    maxWidth: 620, width: '100%' }}>
        {features.map(f => (
          <div key={f.title} className="card" style={{ padding: '16px 14px' }}>
            <div style={{ fontSize: 22, marginBottom: 7 }}>{f.icon}</div>
            <div style={{ fontWeight: 600, marginBottom: 5, fontSize: 13 }}>{f.title}</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}


---

CREATE dashboard/src/components/Sidebar.jsx:

export default function Sidebar({ active, navigate, isAdmin, queueCount, inboxCount, user }) {
  const nav = [
    { id: 'home',      icon: '🏠', label: 'Home',
      badge: queueCount > 0 ? queueCount : null, badgeColor: 'var(--yellow)' },
    { id: 'pipeline',  icon: '📋', label: 'Pipeline' },
    { id: 'find-job',  icon: '🔍', label: 'Find a Job' },
    { id: 'inbox',     icon: '📩', label: 'Inbox',
      badge: inboxCount > 0 ? inboxCount : null, badgeColor: 'var(--blue)' },
    { id: 'freelance', icon: '💼', label: 'Freelance', badge: null },
    { id: 'profile',   icon: '👤', label: 'Profile' },
    { id: 'settings',  icon: '⚙️', label: 'Settings' },
  ]

  return (
    <aside className="desktop-sidebar" style={{
      width: 220, flexShrink: 0, background: 'var(--surface)',
      borderRight: '1px solid var(--border)', display: 'flex',
      flexDirection: 'column', height: '100vh', position: 'sticky', top: 0
    }}>
      {/* Logo */}
      <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ fontSize: 20 }}>🚀</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>Job AutoPilot</div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 1 }}>AI-powered job search</div>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: '6px 0', overflowY: 'auto' }}>
        {nav.map(item => {
          const isActive = active === item.id
          return (
            <button key={item.id} onClick={() => navigate(item.id)} style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '9px 16px', background: isActive ? 'var(--card)' : 'transparent',
              border: 'none', cursor: 'pointer', fontSize: 14, textAlign: 'left',
              color: isActive ? 'var(--text)' : 'var(--text-2)',
              borderLeft: `2px solid ${isActive ? 'var(--green)' : 'transparent'}`,
              transition: 'all 0.1s'
            }}>
              <span style={{ fontSize: 15, flexShrink: 0 }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge && (
                <span style={{
                  background: item.badgeColor || 'var(--green)', color: '#000',
                  borderRadius: 100, padding: '1px 7px', fontSize: 11, fontWeight: 700
                }}>
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}

        {/* Admin link — only for admins */}
        {isAdmin && (
          <>
            <div className="divider" />
            <button onClick={() => navigate('admin')} style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '9px 16px',
              background: active === 'admin' ? 'var(--card)' : 'transparent',
              border: 'none', cursor: 'pointer', fontSize: 14, textAlign: 'left',
              color: active === 'admin' ? 'var(--text)' : 'var(--text-3)',
              borderLeft: `2px solid ${active === 'admin' ? 'var(--blue)' : 'transparent'}`
            }}>
              <span style={{ fontSize: 15 }}>🛡</span>
              <span>Admin</span>
            </button>
          </>
        )}
      </nav>

      {/* User footer */}
      {user && (
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', gap: 10 }}>
          {user.picture
            ? <img src={user.picture} alt="" style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }} />
            : <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--green)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 12, fontWeight: 700, color: '#000', flexShrink: 0 }}>
                {user.name?.[0] || '?'}
              </div>
          }
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                          overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.name?.split(' ')[0] || 'You'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', whiteSpace: 'nowrap',
                          overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.email}
            </div>
          </div>
          <a href="/auth/logout" title="Sign out" style={{ fontSize: 16, color: 'var(--text-3)', flexShrink: 0 }}>↪</a>
        </div>
      )}
      <div style={{ padding: '4px 16px 8px', fontSize: 10, color: 'var(--text-3)' }}>v1.0</div>
    </aside>
  )
}


---

CREATE dashboard/src/App.jsx:

import { useState, useEffect } from 'react'
import { UserProvider, useUser } from './UserContext'
import { ToastProvider } from './components/Toast'
import Sidebar from './components/Sidebar'
import SignInScreen from './components/SignInScreen'
import Spinner from './components/Spinner'
import { api } from './lib/api'

function PlaceholderPage({ name }) {
  return (
    <div style={{ padding: 40, color: 'var(--text-2)' }}>
      <h2 style={{ color: 'var(--text)', marginBottom: 8 }}>{name}</h2>
      <p style={{ fontSize: 14 }}>This page will be built in a later phase.</p>
    </div>
  )
}

function AppShell() {
  const { user, isAdmin, loading } = useUser()
  const [page, setPage]         = useState('home')
  const [pageParam, setPageParam] = useState(null)
  const [onboarding, setOnboarding] = useState(false)
  const [queueCount, setQueueCount] = useState(0)
  const [inboxCount, setInboxCount] = useState(0)

  const navigate = (target) => {
    const [p, param] = (target || '').split('?')
    setPage(p)
    setPageParam(param || null)
  }

  // Check if onboarding needed
  useEffect(() => {
    if (!user) return
    api('/api/setup-status')
      .then(d => { if (!d?.profileApproved) setOnboarding(true) })
      .catch(() => {})
  }, [user])

  // Poll badge counts
  useEffect(() => {
    if (!user) return
    const refresh = () => {
      api('/api/approval-queue/stats').then(d => setQueueCount(d?.pending || 0)).catch(() => {})
      api('/api/inbox/unread-count').then(d => setInboxCount(d?.count || 0)).catch(() => {})
    }
    refresh()
    const t = setInterval(refresh, 60000)
    return () => clearInterval(t)
  }, [user])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <Spinner size={28} />
      </div>
    )
  }

  if (!user) return <SignInScreen />

  const renderPage = () => {
    // Onboarding takes over everything until complete
    if (onboarding) return (
      <div style={{ padding: 40 }}>
        <h2 style={{ marginBottom: 12 }}>Onboarding</h2>
        <p style={{ color: 'var(--text-2)', marginBottom: 20 }}>Phase 4 will build this screen.</p>
        <button className="btn btn-secondary btn-sm" onClick={() => setOnboarding(false)}>
          Skip (dev only)
        </button>
      </div>
    )

    switch (page) {
      default: return <PlaceholderPage name={page} />
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar
        active={page}
        navigate={navigate}
        isAdmin={isAdmin}
        queueCount={queueCount}
        inboxCount={inboxCount}
        user={user}
      />
      <main style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>
        {renderPage()}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <UserProvider>
      <ToastProvider>
        <AppShell />
      </ToastProvider>
    </UserProvider>
  )
}


---

TEST:
  cd dashboard && npm run dev
  Open http://localhost:5173

  Case A — NOT signed in:
    → Sign-in screen with Google button and 6 feature cards visible
    → No sidebar

  Case B — Signed in (cookies from backend):
    → Sidebar visible with 7 nav items (Home, Pipeline, Find a Job, Inbox, Freelance, Profile, Settings)
    → Admin link only visible if ADMIN_USER_ID env var matches your userId
    → Clicking nav items shows placeholder text
    → If profileApproved=false: shows onboarding placeholder with dev skip button

  No console errors. Sidebar renders correctly.
  Stop here.
```

---

## ✅ Phase 3 Complete When
- [ ] Sign-in screen renders when logged out
- [ ] Sidebar renders when logged in
- [ ] 7 nav items visible (including Inbox and Freelance — new!)
- [ ] Admin link only shows for admin users
- [ ] No console errors
