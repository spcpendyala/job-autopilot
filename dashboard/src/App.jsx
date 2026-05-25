import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Toast from './components/Toast'
import Onboarding from './components/Onboarding'
import AuthGate from './components/AuthGate'
import MorningBrief from './pages/MorningBrief'
import PipelinePage from './pages/Pipeline'
import FindJob from './pages/FindJob'
import Settings from './pages/Settings'
import ApprovalScreen from './pages/ApprovalScreen'
import Outreach from './pages/Outreach'
import Profile from './pages/Profile'
import Insights from './components/Insights'
import AdminDashboard from './pages/AdminDashboard'
import './styles.css'

function ProfileGate({ onUpload }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(8,8,8,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 48, maxWidth: 440, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 20 }}>🚀</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Welcome to Job AutoPilot</h1>
        <p style={{ color: 'var(--text-2)', fontSize: 15, lineHeight: 1.6, marginBottom: 28 }}>
          Upload your resumes to get started. We'll build your profile automatically using Claude.
        </p>
        <button className="btn" onClick={onUpload} style={{ width: '100%', padding: '14px 0', fontSize: 16, marginBottom: 16 }}>
          Upload Resumes →
        </button>
        <div style={{ color: 'var(--text-3)', fontSize: 13 }}>
          Have a profile already?{' '}
          <span style={{ color: 'var(--text-2)', cursor: 'pointer', textDecoration: 'underline' }} onClick={onUpload}>
            Import Profile
          </span>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [activePage, setActivePage] = useState('home')
  const [setupStatus, setSetupStatus] = useState(null)
  const [morningBrief, setMorningBrief] = useState(null)
  const [toasts, setToasts] = useState([])
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showProfileGate, setShowProfileGate] = useState(false)
  const [prefillUrl, setPrefillUrl] = useState('')
  const [pendingApprovals, setPendingApprovals] = useState(0)
  const [pendingQueue, setPendingQueue] = useState([])

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

  const refreshPendingApprovals = () => {
    fetch('/api/approval-queue/stats')
      .then(r => r.json())
      .then(d => setPendingApprovals(d.pending || 0))
      .catch(() => {})
    fetch('/api/approval-queue')
      .then(r => r.json())
      .then(d => setPendingQueue(Array.isArray(d) ? d : []))
      .catch(() => setPendingQueue([]))
  }

  useEffect(() => {
    fetch('/api/setup-status')
      .then(r => r.json())
      .then(data => {
        setSetupStatus(data)
        if (!data.complete) {
          setShowOnboarding(true)
        } else if (!data.profileApproved) {
          setShowProfileGate(true)
        }
      })
      .catch(() => {})

    refreshMorningBrief()
    refreshPendingApprovals()
  }, [])

  // Re-check pending approvals when navigating to relevant pages
  useEffect(() => {
    if (activePage === 'home' || activePage === 'approval') {
      refreshPendingApprovals()
    }
  }, [activePage])

  const navigateToFind = (url = '') => {
    setPrefillUrl(url)
    setActivePage('find')
  }

  return (
    <AuthGate>
    <div className="app-layout">
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        morningBrief={morningBrief}
        pendingApprovals={pendingApprovals}
      />
      <main className="app-main">
        {activePage === 'home' && (
          <MorningBrief
            brief={morningBrief}
            pendingApprovals={pendingApprovals}
            pendingQueue={pendingQueue}
            onNavigate={setActivePage}
            onQuickApply={navigateToFind}
            addToast={addToast}
            refreshBrief={() => refreshMorningBrief(true)}
          />
        )}
        {activePage === 'approval' && (
          <ApprovalScreen
            onBack={() => { refreshPendingApprovals(); setActivePage('home') }}
            addToast={addToast}
          />
        )}
        {activePage === 'pipeline' && (
          <PipelinePage addToast={addToast} />
        )}
        {activePage === 'outreach' && (
          <Outreach addToast={addToast} />
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
        {activePage === 'profile' && (
          <Profile addToast={addToast} />
        )}
        {activePage === 'insights' && (
          <Insights />
        )}
        {activePage === 'admin' && <AdminDashboard addToast={addToast} />}
      </main>

      {/* Profile gate: shown when profile not yet approved */}
      {showProfileGate && !showOnboarding && (
        <ProfileGate
          onUpload={() => {
            setShowProfileGate(false)
            setActivePage('profile')
          }}
        />
      )}

      {showOnboarding && (
        <Onboarding
          setupStatus={setupStatus}
          onComplete={() => {
            setShowOnboarding(false)
            fetch('/api/setup-status')
              .then(r => r.json())
              .then(data => {
                setSetupStatus(data)
                if (!data.profileApproved) setShowProfileGate(true)
              })
              .catch(() => {})
            refreshMorningBrief()
          }}
          addToast={addToast}
        />
      )}

      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
    </AuthGate>
  )
}
