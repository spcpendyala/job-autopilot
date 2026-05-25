export default function Sidebar({ activePage, setActivePage, morningBrief, pendingApprovals }) {
  const navItems = [
    { id: 'home',     icon: '🌅', label: 'Morning Brief' },
    { id: 'approval', icon: '⏳', label: 'Review Queue',  badge: pendingApprovals },
    { id: 'pipeline', icon: '📋', label: 'Pipeline' },
    { id: 'outreach', icon: '📨', label: 'Outreach' },
    { id: 'find',     icon: '🔍', label: 'Find a Job' },
    { id: 'profile',  icon: '👤', label: 'Profile' },
    { id: 'settings', icon: '⚙️', label: 'Settings' },
  ]

  const stats = morningBrief?.stats
  const applied = stats?.applied || 0

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="sidebar-logo">
          <span className="sidebar-logo-icon">🚀</span>
          <div>
            <div className="sidebar-logo-name">Job AutoPilot</div>
            <div className="sidebar-logo-sub">AI job search co-pilot</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`sidebar-nav-item${activePage === item.id ? ' active' : ''}`}
              onClick={() => setActivePage(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge > 0 && <span className="nav-badge">{item.badge}</span>}
            </button>
          ))}
        </nav>
      </div>

      <div className="sidebar-bottom">
        <span>{applied} applied</span>
        <span style={{ color: 'var(--text-3)' }}>v1.0</span>
      </div>
    </aside>
  )
}
