# PHASE 2 — Design System + Utility Components

## Goal
Create the design system (CSS variables, utility classes) and 6 small shared
components used everywhere. No pages yet.

---

## Prompt for Claude Code

```
Phase 1 is complete. Backend is verified. dashboard/src has 3 empty folders.

Do not touch api/server.js, services/, agents/, or discovery/.
Only create files inside dashboard/src/.

---

CREATE dashboard/src/index.css — complete design system:

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:         #080808;
  --surface:    #0f0f0f;
  --card:       #161616;
  --card-hover: #1e1e1e;
  --border:     #242424;
  --border-hi:  #333333;
  --text:       #f0f0f0;
  --text-2:     #999999;
  --text-3:     #555555;
  --green:      #22c55e;
  --green-dim:  #166534;
  --yellow:     #eab308;
  --yellow-dim: #713f12;
  --red:        #ef4444;
  --red-dim:    #7f1d1d;
  --blue:       #3b82f6;
  --blue-dim:   #1e3a5f;
  --purple:     #a855f7;
  --purple-dim: #3b0764;
  --radius-sm:  6px;
  --radius:     10px;
  --radius-lg:  16px;
}

html, body, #root {
  height: 100%;
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

a { color: inherit; text-decoration: none; }
button { font-family: inherit; }
input, textarea, select { font-family: inherit; font-size: 14px; }

/* ── Buttons ── */
.btn {
  display: inline-flex; align-items: center; gap: 6px;
  border: none; border-radius: var(--radius-sm);
  padding: 9px 18px; font-size: 14px; font-weight: 500;
  cursor: pointer; transition: opacity 0.15s;
  white-space: nowrap; line-height: 1;
}
.btn:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-primary   { background: var(--green); color: #000; font-weight: 600; }
.btn-primary:hover:not(:disabled) { opacity: 0.85; }
.btn-secondary { background: transparent; color: var(--text); border: 1px solid var(--border-hi); }
.btn-secondary:hover:not(:disabled) { border-color: var(--text-2); }
.btn-ghost     { background: transparent; color: var(--text-2); padding: 8px 12px; font-size: 13px; }
.btn-ghost:hover { color: var(--text); }
.btn-danger    { background: var(--red-dim); color: var(--red); border: 1px solid var(--red-dim); }
.btn-purple    { background: var(--purple-dim); color: var(--purple); border: 1px solid var(--purple-dim); }
.btn-sm  { padding: 6px 12px; font-size: 12px; }
.btn-lg  { padding: 13px 28px; font-size: 16px; }
.btn-full { width: 100%; justify-content: center; }

/* ── Cards ── */
.card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; }
.card-hover { transition: background 0.15s; cursor: pointer; }
.card-hover:hover { background: var(--card-hover); }

/* ── Badges ── */
.badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 100px; font-size: 11px; font-weight: 600; }
.badge-green  { background: var(--green-dim);  color: var(--green); }
.badge-yellow { background: var(--yellow-dim); color: var(--yellow); }
.badge-red    { background: var(--red-dim);    color: var(--red); }
.badge-blue   { background: var(--blue-dim);   color: var(--blue); }
.badge-purple { background: var(--purple-dim); color: var(--purple); }
.badge-grey   { background: var(--border-hi);  color: var(--text-2); }

/* ── Form inputs ── */
.input {
  width: 100%; background: var(--card); border: 1px solid var(--border);
  border-radius: var(--radius-sm); padding: 10px 14px;
  color: var(--text); outline: none; transition: border-color 0.15s;
}
.input:focus { border-color: var(--border-hi); }
.input::placeholder { color: var(--text-3); }
textarea.input { resize: vertical; min-height: 80px; }

.label { font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: var(--text-3); }

/* ── Tag chips ── */
.tag {
  display: inline-flex; align-items: center; gap: 4px;
  background: var(--border); color: var(--text-2);
  border-radius: 100px; padding: 3px 10px; font-size: 12px;
}
.tag-green  { background: var(--green-dim);  color: var(--green); }
.tag-purple { background: var(--purple-dim); color: var(--purple); }

/* ── Section header ── */
.section-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 0 10px; cursor: pointer; user-select: none;
}
.section-title { font-weight: 700; font-size: 13px; letter-spacing: 0.5px; text-transform: uppercase; color: var(--text-2); }

/* ── Scrollbar ── */
::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border-hi); border-radius: 3px; }

/* ── Animations ── */
@keyframes fadein { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
@keyframes spin   { to { transform: rotate(360deg); } }
.fadein { animation: fadein 0.2s ease; }
.spin   { animation: spin 1s linear infinite; display: inline-block; }

/* ── Divider ── */
.divider { height: 1px; background: var(--border); margin: 16px 0; }

/* ── Mobile nav (built in Phase 16, class reserved) ── */
.mobile-nav { display: none; }
@media (max-width: 768px) {
  .mobile-nav { display: flex; }
  .desktop-sidebar { display: none !important; }
}


---

CREATE dashboard/src/main.jsx:

import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
createRoot(document.getElementById('root')).render(<App />)


---

CREATE dashboard/src/lib/api.js:

// ── Core fetch wrapper ──────────────────────────────────────────────────────
export async function api(path, options = {}) {
  const opts = { credentials: 'include', ...options }
  if (options.body && typeof options.body === 'string') {
    opts.headers = { 'Content-Type': 'application/json', ...options.headers }
  }
  const res = await fetch(path, opts)
  if (res.status === 401) { window.location.href = '/auth/google'; return null }
  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch { data = { error: text || 'Unknown error' } }
  if (!res.ok) throw new Error(data?.error || `Request failed: ${res.status}`)
  return data
}

// ── Date helpers ────────────────────────────────────────────────────────────
export function daysAgo(dateStr) {
  if (!dateStr) return null
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 86400000)
  if (diff === 0) return 'today'
  if (diff === 1) return 'yesterday'
  return `${diff}d ago`
}

export function daysAgoColor(dateStr) {
  if (!dateStr) return 'var(--text-3)'
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 86400000)
  if (diff >= 10) return 'var(--red)'
  if (diff >= 5)  return 'var(--yellow)'
  return 'var(--text-2)'
}

export function formatDate(d = new Date()) {
  return new Date(d).toLocaleDateString('en-CA', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  })
}

// ── Score helpers ───────────────────────────────────────────────────────────
export function scoreColor(score) {
  if (!score) return 'var(--text-3)'
  if (score >= 8) return 'var(--green)'
  if (score >= 6) return 'var(--yellow)'
  return 'var(--red)'
}

export function verdictLabel(score) {
  if (!score) return '—'
  if (score >= 8.5) return 'STRONG MATCH'
  if (score >= 7.5) return 'GOOD MATCH'
  if (score >= 6.5) return 'POSSIBLE'
  return 'STRETCH'
}

export function verdictClass(score) {
  if (!score) return 'badge-grey'
  if (score >= 8) return 'badge-green'
  if (score >= 6.5) return 'badge-yellow'
  return 'badge-red'
}

// ── Greeting helpers ────────────────────────────────────────────────────────
export function greetingTime() {
  const h = new Date().getHours()
  if (h < 12) return ['Good morning', '☀️']
  if (h < 17) return ['Good afternoon', '🌤']
  return ['Good evening', '🌙']
}

// ── Profile completeness ────────────────────────────────────────────────────
export function profileCompleteness(p) {
  if (!p) return 0
  let s = 0
  if (p.name)                        s += 15
  if (p.email)                       s += 10
  if (p.location)                    s += 10
  if (p.summary || p.about)          s += 10
  if (p.targetRoles?.length >= 2)    s += 10
  if (p.experience?.length >= 1)     s += 15
  if (p.coreSkills?.length >= 5)     s += 10
  if (p.education?.length >= 1)      s += 5
  if (p.certifications?.length >= 1) s += 5
  if (p.phone)                       s += 5
  if (p.linkedin)                    s += 5
  return Math.min(s, 100)
}

// ── Platform helpers ────────────────────────────────────────────────────────
// Detects if a job is freelance-platform-sourced
export function isFreelancePlatform(source) {
  return ['upwork', 'fiverr', 'freelancer', 'peopleperhour'].includes(
    (source || '').toLowerCase()
  )
}

export function platformLabel(source) {
  const map = {
    upwork: 'Upwork', fiverr: 'Fiverr', freelancer: 'Freelancer.com',
    peopleperhour: 'PeoplePerHour', indeed: 'Indeed', linkedin: 'LinkedIn',
    remoteok: 'Remote OK', remotive: 'Remotive', monster: 'Monster',
    weworkremotely: 'We Work Remotely'
  }
  return map[(source || '').toLowerCase()] || source || 'Unknown'
}

// ── Clipboard helper ────────────────────────────────────────────────────────
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const el = document.createElement('textarea')
    el.value = text
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
    return true
  }
}


---

CREATE dashboard/src/components/ScoreDots.jsx:

import { scoreColor } from '../lib/api'
export default function ScoreDots({ score, size = 8, showNumber = true }) {
  const filled = Math.round((score || 0) / 2)
  const color = scoreColor(score)
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{
          width: size, height: size, borderRadius: '50%', flexShrink: 0,
          background: i <= filled ? color : 'var(--border-hi)'
        }} />
      ))}
      {showNumber && score && (
        <span style={{ marginLeft: 6, fontSize: 13, fontWeight: 600, color }}>
          {Number(score).toFixed(1)}
        </span>
      )}
    </span>
  )
}


---

CREATE dashboard/src/components/Spinner.jsx:

export default function Spinner({ size = 18, color = 'var(--text-2)' }) {
  return (
    <span className="spin" style={{
      display: 'inline-block', width: size, height: size, flexShrink: 0,
      border: `2px solid ${color}30`, borderTopColor: color, borderRadius: '50%'
    }} />
  )
}


---

CREATE dashboard/src/components/EmptyState.jsx:

export default function EmptyState({ icon, title, subtitle, action, onAction, loading }) {
  return (
    <div style={{ textAlign: 'center', padding: '28px 16px', color: 'var(--text-2)' }}>
      {icon && <div style={{ fontSize: 28, marginBottom: 10 }}>{icon}</div>}
      <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 6, fontSize: 14 }}>{title}</div>
      {subtitle && (
        <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: action ? 16 : 0,
                      maxWidth: 300, margin: '0 auto', lineHeight: 1.6 }}>
          {subtitle}
        </div>
      )}
      {action && onAction && (
        <button className="btn btn-primary btn-sm" onClick={onAction}
                disabled={loading} style={{ marginTop: 14 }}>
          {loading ? 'Loading...' : action}
        </button>
      )}
    </div>
  )
}


---

CREATE dashboard/src/components/Toast.jsx:

import { useState, useCallback, createContext, useContext } from 'react'
const ToastCtx = createContext(null)
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const toast = useCallback((msg, type = 'success') => {
    const id = Date.now() + Math.random()
    setToasts(t => [...t.slice(-2), { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }, [])

  const colors = {
    success: 'var(--green)',
    error:   'var(--red)',
    info:    'var(--blue)',
    warning: 'var(--yellow)'
  }

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div style={{ position: 'fixed', bottom: 72, right: 16, zIndex: 9999,
                    display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
        {toasts.map(t => (
          <div key={t.id} className="fadein" style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderLeft: `3px solid ${colors[t.type] || colors.info}`,
            borderRadius: 'var(--radius-sm)', padding: '10px 16px',
            fontSize: 13, maxWidth: 300, boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            pointerEvents: 'all'
          }}>{t.msg}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}


---

CREATE dashboard/src/components/Modal.jsx:
(reusable modal wrapper used in multiple pages)

import { useEffect } from 'react'
export default function Modal({ open, onClose, title, children, width = 700 }) {
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000,
                  background: 'rgba(0,0,0,0.85)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', padding: 16 }}
         onClick={onClose}>
      <div className="fadein" style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: width,
        maxHeight: '90vh', overflow: 'auto'
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '16px 20px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0,
                      background: 'var(--card)', zIndex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{title}</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '4px 8px' }}>✕</button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  )
}


---

TEST:
  cd dashboard && npm install && npm run dev
  Open http://localhost:5173
  Expected: blank dark page (#080808 background), no console errors.
  DevTools → Console must be clean (no red errors).
  Stop here. Do not build any pages yet.
```

---

## ✅ Phase 2 Complete When
- [ ] `npm run dev` runs without errors
- [ ] Browser shows dark `#080808` background
- [ ] No red console errors
- [ ] All 6 component files exist in `dashboard/src/components/`
- [ ] `dashboard/src/lib/api.js` exists with all helpers
