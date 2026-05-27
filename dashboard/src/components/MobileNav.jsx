const TABS = [
  { id: 'home',      icon: '🏠', label: 'Home' },
  { id: 'pipeline',  icon: '📋', label: 'Pipeline' },
  { id: 'find-job',  icon: '🔍', label: 'Find' },
  { id: 'inbox',     icon: '📩', label: 'Inbox' },
  { id: 'freelance', icon: '💼', label: 'Freelance' },
]

export default function MobileNav({ active, navigate, queueCount, inboxCount }) {
  return (
    <nav className="mobile-nav" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      height: 60, background: 'var(--surface)', borderTop: '1px solid var(--border)',
      display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', zIndex: 500,
    }}>
      {TABS.map(tab => {
        const isActive = active === tab.id
        const hasBadge = (tab.id === 'home' && queueCount > 0) || (tab.id === 'inbox' && inboxCount > 0)
        return (
          <button
            key={tab.id}
            onClick={() => navigate(tab.id)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 2, background: 'none', border: 'none', cursor: 'pointer',
              color: isActive ? 'var(--green)' : 'var(--text-3)',
              position: 'relative', minHeight: 44,
            }}
          >
            {isActive && (
              <span style={{
                position: 'absolute', top: 4, left: '50%', transform: 'translateX(-50%)',
                width: 4, height: 4, borderRadius: '50%', background: 'var(--green)',
              }} />
            )}
            <span style={{ fontSize: 20, position: 'relative' }}>
              {tab.icon}
              {hasBadge && (
                <span style={{
                  position: 'absolute', top: -2, right: -4,
                  width: 6, height: 6, borderRadius: '50%', background: 'var(--red)',
                }} />
              )}
            </span>
            <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 400 }}>{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
