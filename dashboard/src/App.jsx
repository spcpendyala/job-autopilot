import { useState, useEffect } from 'react'
import Header from './components/Header'
import TabNav from './components/TabNav'
import Pipeline from './components/Pipeline'
import Analyze from './components/Analyze'
import Stats from './components/Stats'
import './styles.css'

export default function App() {
  const [activeTab, setActiveTab] = useState('pipeline')
  const [stats, setStats] = useState(null)

  const refreshStats = () =>
    fetch('/api/stats').then(r => r.json()).then(setStats).catch(() => {})

  useEffect(() => { refreshStats() }, [])

  return (
    <div className="app">
      <Header stats={stats} />
      <TabNav activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="main">
        {activeTab === 'pipeline' && <Pipeline onApply={refreshStats} />}
        {activeTab === 'analyze' && <Analyze onApply={refreshStats} />}
        {activeTab === 'stats' && <Stats />}
      </main>
    </div>
  )
}
