export default function Sidebar({ activePage, setActivePage, morningBrief }) {
  const navItems = [
    { id: 'home', icon: '🌅', label: 'Morning Brief' },
    { id: 'pipeline', icon: '📋', label: 'Pipeline' },
    { id: 'find', icon: '🔍', label: 'Find a Job' },
    { id: 'settings', icon: '⚙️', label: 'Settings' },
  ]

  const stats = morningBrief?.stats
  const appliedThisWeek = stats?.applied || 0

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="sidebar-logo">
          <span className="sidebar-logo-icon">🚀</span>
          <div>
            <div className="sidebar-logo-name">Job AutoPilot</div>
            <div className="sidebar-logo-sub">Your AI job search co-pilot</div>
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
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="sidebar-bottom">
        <span>{appliedThisWeek} applied total</span>
        <span>v1.0</span>
      </div>
    </aside>
  )
}
