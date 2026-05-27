import { useState, useEffect } from 'react'
import { UserProvider, useUser } from './UserContext'
import { ToastProvider, useToast } from './components/Toast'
import Sidebar from './components/Sidebar'
import SignInScreen from './components/SignInScreen'
import Spinner from './components/Spinner'
import Onboarding from './components/Onboarding'
import Home from './pages/Home'
import PipelinePage from './pages/Pipeline'
import FindJob from './pages/FindJob'
import Settings from './pages/Settings'
import ApprovalScreen from './pages/ApprovalScreen'
import Outreach from './pages/Outreach'
import Profile from './pages/Profile'
import AdminDashboard from './pages/AdminDashboard'
import Freelance from './pages/Freelance'
import Inbox from './pages/Inbox'
import { api } from './lib/api'
import './styles.css'

function AppShell() {
  const { user, isAdmin, loading } = useUser()
  const { toast } = useToast()

  const [page, setPage]           = useState('home')
  const [pageParam, setPageParam] = useState(null)
  const [onboarding, setOnboarding] = useState(false)
  const [queueCount, setQueueCount] = useState(0)
  const [inboxCount, setInboxCount] = useState(0)

  const navigate = (target) => {
    const [p, param] = (target || '').split('?')
    setPage(p)
    setPageParam(param || null)
    window.scrollTo(0, 0)
  }

  useEffect(() => {
    const titles = {
      home: 'Home — Job AutoPilot',
      pipeline: 'Pipeline — Job AutoPilot',
      'find-job': 'Find a Job — Job AutoPilot',
      inbox: 'Inbox — Job AutoPilot',
      freelance: 'Freelance — Job AutoPilot',
      profile: 'Profile — Job AutoPilot',
      settings: 'Settings — Job AutoPilot',
      admin: 'Admin — Job AutoPilot',
      approval: 'Review — Job AutoPilot',
    }
    document.title = titles[page] || 'Job AutoPilot'
  }, [page])

  useEffect(() => {
    if (!user) return
    api('/api/setup-status')
      .then(d => { if (d && !d.profileApproved) setOnboarding(true) })
      .catch(() => {})
  }, [user])

  useEffect(() => {
    if (!user) return
    const refresh = () => {
      api('/api/approval-queue/stats').then(d => setQueueCount(d?.pending || 0)).catch(() => {})
      api('/api/inbox/unread-count').then(d => setInboxCount(d?.count || 0)).catch(() => {})
    }
    refresh()
    const t = setInterval(refresh, 60000)
    return () => clearInterval(t)
  }, [user])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <Spinner size={28} />
      </div>
    )
  }

  if (!user) return <SignInScreen />

  if (onboarding) {
    return (
      <Onboarding
        onComplete={() => {
          setOnboarding(false)
          navigate('home')
        }}
        addToast={toast}
      />
    )
  }

  const renderPage = () => {
    switch (page) {
      case 'home':
        return <Home navigate={navigate} user={user} addToast={toast} />
      case 'approval':
        return (
          <ApprovalScreen
            approvalId={pageParam}
            onBack={() => navigate('home')}
            addToast={toast}
          />
        )
      case 'pipeline':
        return <PipelinePage navigate={navigate} addToast={toast} />
      case 'find-job':
        return (
          <FindJob
            prefillUrl={pageParam ? decodeURIComponent(pageParam.replace('url=', '')) : ''}
            onNavigatePipeline={() => navigate('pipeline')}
            addToast={toast}
          />
        )
      case 'profile':
        return <Profile navigate={navigate} addToast={toast} />
      case 'settings':
        return <Settings navigate={navigate} addToast={toast} />
      case 'outreach':
        return <Outreach addToast={toast} />
      case 'admin':
        return <AdminDashboard navigate={navigate} addToast={toast} />
      case 'inbox':
        return <Inbox navigate={navigate} user={user} />
      case 'freelance':
        return <Freelance navigate={navigate} user={user} />
      default:
        return (
          <div style={{ padding: 40, color: 'var(--text-2)' }}>
            <h2 style={{ color: 'var(--text)', marginBottom: 8 }}>{page}</h2>
            <p style={{ fontSize: 14 }}>Page not found.</p>
          </div>
        )
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar
        active={page}
        navigate={navigate}
        isAdmin={isAdmin}
        queueCount={queueCount}
        inboxCount={inboxCount}
        user={user}
      />
      <main style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>
        {renderPage()}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <UserProvider>
      <ToastProvider>
        <AppShell />
      </ToastProvider>
    </UserProvider>
  )
}
