import React from 'react'
import { createRoot } from 'react-dom/client'
import { applyTheme, getStoredTheme } from './lib/theme'
import './index.css'
import App from './App'
import PrivacyPolicy from './pages/PrivacyPolicy'

applyTheme(getStoredTheme())

const pathname = window.location.pathname
const root = createRoot(document.getElementById('root'))

if (pathname === '/privacy') {
  root.render(<PrivacyPolicy />)
} else if (pathname === '/terms') {
  root.render(
    <div style={{ background: '#080808', minHeight: '100vh', color: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: 28, marginBottom: 12 }}>Terms of Service</h1>
        <p style={{ color: '#888' }}>Coming soon.</p>
        <a href="/privacy" style={{ color: '#6366f1', marginTop: 24, display: 'block' }}>← Privacy Policy</a>
      </div>
    </div>
  )
} else {
  root.render(<App />)
}
