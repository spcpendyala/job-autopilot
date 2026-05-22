import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Toast from './components/Toast'
import Onboarding from './components/Onboarding'
import MorningBrief from './pages/MorningBrief'
import PipelinePage from './pages/Pipeline'
import FindJob from './pages/FindJob'
import Settings from './pages/Settings'
import './styles.css'

export default function App() {
  const [activePage, setActivePage] = useState('home')
  const [setupStatus, setSetupStatus] = useState(null)
  const [morningBrief, setMorningBrief] = useState(null)
  const [toasts, setToasts] = useState([])
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [prefillUrl, setPrefillUrl] = useState('')

  const addToast = (message, type = 'success') => {
    const id = Date.now()
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000)
  }

  const removeToast = (id) => setToasts(t => t.filter(x => x.id !== id))

  const refreshMorningBrief = (force = false) =>
    fetch(`/api/morning-brief${force ? '?refresh=true' : ''}`)
      .then(r => r.json())
      .then(setMorningBrief)
      .catch(() => {})

  useEffect(() => {
    fetch('/api/setup-status')
      .then(r => r.json())
      .then(data => {
        setSetupStatus(data)
        if (!data.complete) setShowOnboarding(true)
      })
      .catch(() => {})

    refreshMorningBrief()
  }, [])

  const navigateToFind = (url = '') => {
    setPrefillUrl(url)
    setActivePage('find')
  }

  return (
    <div className="app-layout">
      <Sidebar activePage={activePage} setActivePage={setActivePage} morningBrief={morningBrief} />
      <main className="app-main">
        {activePage === 'home' && (
          <MorningBrief
            brief={morningBrief}
            onQuickApply={navigateToFind}
            addToast={addToast}
            refreshBrief={() => refreshMorningBrief(true)}
          />
        )}
        {activePage === 'pipeline' && (
          <PipelinePage addToast={addToast} />
        )}
        {activePage === 'find' && (
          <FindJob
            prefillUrl={prefillUrl}
            onNavigatePipeline={() => setActivePage('pipeline')}
            addToast={addToast}
          />
        )}
        {activePage === 'settings' && (
          <Settings addToast={addToast} />
        )}
      </main>

      {showOnboarding && (
        <Onboarding
          setupStatus={setupStatus}
          onComplete={() => {
            setShowOnboarding(false)
            fetch('/api/setup-status').then(r => r.json()).then(setSetupStatus).catch(() => {})
            refreshMorningBrief()
          }}
          addToast={addToast}
        />
      )}

      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  )
}
