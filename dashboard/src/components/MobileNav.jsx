const NAV_ITEMS = [
  { id: 'home',     label: 'Home',     emoji: '🏠' },
  { id: 'pipeline', label: 'Pipeline', emoji: '📋' },
  { id: 'find-job', label: 'Find Job', emoji: '🔍' },
  { id: 'inbox',    label: 'Inbox',    emoji: '📬' },
  { id: 'profile',  label: 'Profile',  emoji: '👤' },
  { id: 'settings', label: 'Settings', emoji: '⚙️' },
]

export default function MobileNav({ page, navigate, queueCount = 0, inboxCount = 0 }) {
  return (
    <nav
      className="mobile-nav"
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        height: 60, background: 'var(--card)',
        borderTop: '1px solid var(--border)',
        display: 'flex', zIndex: 100,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {NAV_ITEMS.map(item => {
        const isActive = page === item.id
        const badge = item.id === 'home' ? queueCount : item.id === 'inbox' ? inboxCount : 0
        return (
          <button
            key={item.id}
            onClick={() => navigate(item.id)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 2,
              background: 'none', border: 'none', cursor: 'pointer',
              color: isActive ? 'var(--green)' : 'var(--text-3)',
              borderTop: isActive ? '2px solid var(--green)' : '2px solid transparent',
              position: 'relative', padding: 0,
            }}
          >
            <span style={{ fontSize: 18, position: 'relative' }}>
              {item.emoji}
              {badge > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -6,
                  background: 'var(--yellow)', color: '#000',
                  borderRadius: 100, fontSize: 9, fontWeight: 700,
                  padding: '1px 4px', lineHeight: 1.2,
                }}>{badge}</span>
              )}
            </span>
            <span style={{ fontSize: 10, fontWeight: 500 }}>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
