export default function Header({ stats }) {
  return (
    <header className="header">
      <div className="header-title">🚀 Job AutoPilot</div>
      {stats && (
        <div className="stats-bar">
          <span>Total: <span className="val">{stats.total}</span></span>
          <span>Applied: <span className="val">{stats.applied}</span></span>
          <span>Interviews: <span className="val">{stats.interviews}</span></span>
          <span>Response Rate: <span className="val">{stats.responseRate}</span></span>
        </div>
      )}
    </header>
  )
}
