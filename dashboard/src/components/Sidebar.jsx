import NotificationBell from './NotificationBell'

export default function Sidebar({ active, navigate, isAdmin, queueCount, inboxCount, user }) {
  const nav = [
    { id: 'home',      icon: '🏠', label: 'Home',
      badge: queueCount > 0 ? queueCount : null, badgeColor: 'var(--yellow)' },
    { id: 'pipeline',  icon: '📋', label: 'Pipeline' },
    { id: 'find-job',  icon: '🔍', label: 'Find a Job' },
    { id: 'inbox',     icon: '📩', label: 'Inbox',
      badge: inboxCount > 0 ? inboxCount : null, badgeColor: 'var(--blue)' },
    { id: 'freelance', icon: '💼', label: 'Freelance' },
    { id: 'profile',   icon: '👤', label: 'Profile' },
    { id: 'settings',  icon: '⚙️', label: 'Settings' },
  ]

  return (
    <aside className="desktop-sidebar sidebar" style={{
      width: 220, flexShrink: 0, background: 'var(--surface)',
      borderRight: '1px solid var(--border)', display: 'flex',
      flexDirection: 'column', height: '100vh', position: 'sticky', top: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ fontSize: 20 }}>🚀</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Job AutoPilot</div>
              <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 1 }}>AI-powered job search</div>
            </div>
          </div>
          <NotificationBell navigate={navigate} />
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
              transition: 'all 0.1s', minHeight: 'unset',
            }}>
              <span style={{ fontSize: 15, flexShrink: 0 }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge && (
                <span style={{
                  background: item.badgeColor || 'var(--green)', color: '#000',
                  borderRadius: 100, padding: '1px 7px', fontSize: 11, fontWeight: 700,
                }}>
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}

        {/* Admin link */}
        {isAdmin && (
          <>
            <div className="divider" style={{ margin: '8px 16px' }} />
            <button onClick={() => navigate('admin')} style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '9px 16px',
              background: active === 'admin' ? 'var(--card)' : 'transparent',
              border: 'none', cursor: 'pointer', fontSize: 14, textAlign: 'left',
              color: active === 'admin' ? 'var(--text)' : 'var(--text-3)',
              borderLeft: `2px solid ${active === 'admin' ? 'var(--blue)' : 'transparent'}`,
              minHeight: 'unset',
            }}>
              <span style={{ fontSize: 15 }}>🛡</span>
              <span>Admin</span>
            </button>
          </>
        )}
      </nav>

      {/* User footer */}
      {user && (
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
          {/* User info row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            {user.picture
              ? <img src={user.picture} alt="" style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }} />
              : <div style={{
                  width: 28, height: 28, borderRadius: '50%', background: 'var(--green)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: '#000', flexShrink: 0,
                }}>
                  {user.name?.[0] || '?'}
                </div>
            }
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {user.name?.split(' ')[0] || 'You'}
              </div>
              <div style={{
                fontSize: 10, color: 'var(--text-3)', whiteSpace: 'nowrap',
                overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {user.email}
              </div>
            </div>
          </div>
          {/* Sign out button */}
          <a href="/auth/logout" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            width: '100%', padding: '7px 12px', background: 'transparent',
            border: '1px solid var(--border-hi)', borderRadius: 'var(--radius-sm)',
            color: 'var(--text-2)', fontSize: 12, fontWeight: 500,
            textDecoration: 'none', transition: 'all 0.15s', cursor: 'pointer',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--red)'; e.currentTarget.style.color = 'var(--red)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-hi)'; e.currentTarget.style.color = 'var(--text-2)' }}
          >
            ↪ Sign out
          </a>
        </div>
      )}

      <div style={{ padding: '4px 16px 8px', fontSize: 10, color: 'var(--text-3)' }}>v1.0</div>
    </aside>
  )
}
