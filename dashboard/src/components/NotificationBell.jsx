import { useState, useEffect, useRef } from 'react'
import { api, daysAgo } from '../lib/api'

const TYPE_ICONS = {
  new_package:   '✍️',
  discovery:     '🔍',
  response:      '📩',
  interview:     '🎯',
  follow_up_due: '⏰',
  system:        'ℹ️',
}

const TYPE_PAGES = {
  new_package:   'home',
  discovery:     'home',
  response:      'inbox',
  interview:     'pipeline',
  follow_up_due: 'home',
  system:        'home',
}

export default function NotificationBell({ navigate }) {
  const [notifications, setNotifications] = useState([])
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const unreadCount = notifications.filter(n => !n.read).length

  const fetchNotifs = () => {
    api('/api/notifications')
      .then(d => setNotifications(Array.isArray(d) ? d : []))
      .catch(() => {})
  }

  useEffect(() => {
    fetchNotifs()
    const t = setInterval(fetchNotifs, 90000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const markAllRead = async () => {
    await api('/api/notifications/read-all', { method: 'POST' }).catch(() => {})
    setNotifications(ns => ns.map(n => ({ ...n, read: true })))
  }

  const clickNotif = async (notif) => {
    await api(`/api/notifications/${notif.id}/read`, { method: 'POST' }).catch(() => {})
    setNotifications(ns => ns.map(n => n.id === notif.id ? { ...n, read: true } : n))
    if (navigate) navigate(TYPE_PAGES[notif.type] || 'home')
    setOpen(false)
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 18, padding: '4px 6px', position: 'relative', lineHeight: 1,
          color: 'var(--text-2)',
        }}
        title="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 0, right: 0,
            background: 'var(--red)', color: '#fff',
            borderRadius: '50%', fontSize: 9, fontWeight: 700,
            width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
            lineHeight: 1,
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', marginTop: 6,
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', width: 320, zIndex: 1000,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px', borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>Notifications</span>
            {unreadCount > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={markAllRead} style={{ fontSize: 11 }}>
                Mark all read
              </button>
            )}
          </div>

          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                No notifications yet
              </div>
            ) : (
              notifications.slice(0, 8).map(n => (
                <div
                  key={n.id}
                  onClick={() => clickNotif(n)}
                  style={{
                    display: 'flex', gap: 10, padding: '10px 14px',
                    borderLeft: !n.read ? '2px solid var(--green)' : '2px solid transparent',
                    cursor: 'pointer', borderBottom: '1px solid var(--border)',
                    background: !n.read ? 'rgba(34,197,94,0.04)' : 'transparent',
                  }}
                >
                  <span style={{ fontSize: 16, flexShrink: 0, marginTop: 2 }}>
                    {TYPE_ICONS[n.type] || 'ℹ️'}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 2 }}>{n.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {n.message}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4, textAlign: 'right' }}>
                      {daysAgo(n.created_at)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--text-3)', cursor: 'default' }}>
              Notification history — more coming soon
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
