export default function TabNav({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'pipeline', label: 'Pipeline' },
    { id: 'analyze', label: 'Analyze' },
    { id: 'stats', label: 'Stats' },
  ]
  return (
    <nav className="tabnav">
      {tabs.map(t => (
        <button
          key={t.id}
          className={activeTab === t.id ? 'active' : ''}
          onClick={() => setActiveTab(t.id)}
        >
          {t.label}
        </button>
      ))}
    </nav>
  )
}
