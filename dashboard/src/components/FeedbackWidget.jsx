import { useState, useEffect } from 'react'

export default function FeedbackWidget({ currentPage }) {
  const [open, setOpen] = useState(false)
  const [tried, setTried] = useState('')
  const [worked, setWorked] = useState(null)
  const [severity, setSeverity] = useState(null)
  const [sent, setSent] = useState(false)
  const [isExtension, setIsExtension] = useState(false)

  useEffect(() => {
    // Note: chrome.runtime.id check is read-only — we never send messages or add listeners.
    // "A listener indicated an asynchronous response..." console errors come from OTHER
    // installed extensions (LastPass, Grammarly, etc.), NOT from this code.
    setIsExtension(!!(window.chrome?.runtime?.id))
  }, [])

  function reset() {
    setOpen(false)
    setTried('')
    setWorked(null)
    setSeverity(null)
    setSent(false)
  }

  async function submit() {
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        page: currentPage || window.location.pathname,
        tried,
        severity: worked === 'yes' ? 'none' : severity,
        worked,
      }),
    })
    setSent(true)
    setTimeout(reset, 2000)
  }

  return (
    <>
      {isExtension && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10000,
          background: '#f59e0b', color: '#000', padding: '6px 16px',
          fontSize: '13px', textAlign: 'center',
        }}>
          🧪 Beta — tap 💬 to report anything broken
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Feedback"
        style={{
          position: 'fixed',
          bottom: isExtension ? '80px' : '24px',
          right: '24px',
          zIndex: 9999,
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          background: '#6366f1',
          color: '#fff',
          border: 'none',
          fontSize: '20px',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        💬
      </button>

      {/* Panel */}
      {open && (
        <div style={{
          position: 'fixed',
          bottom: isExtension ? '132px' : '76px',
          right: '24px',
          zIndex: 9999,
          width: '280px',
          background: '#1a1a2e',
          border: '1px solid #333',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          color: '#f0f0f0',
        }}>
          {sent ? (
            <div style={{ textAlign: 'center', padding: '16px 0', fontSize: '18px' }}>
              Thanks! 🙌
            </div>
          ) : (
            <>
              <div style={{ fontWeight: 600, marginBottom: '10px', fontSize: '14px' }}>
                Quick feedback
              </div>
              <textarea
                value={tried}
                onChange={e => setTried(e.target.value.slice(0, 200))}
                placeholder="What were you trying to do?"
                maxLength={200}
                rows={3}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: '#0f0f1a', border: '1px solid #444',
                  borderRadius: '6px', color: '#f0f0f0', padding: '8px',
                  fontSize: '13px', resize: 'none', marginBottom: '10px',
                }}
              />
              <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '6px' }}>
                Did it work?
              </div>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                {[['yes', '✅ Yes'], ['partly', '⚠️ Partly'], ['no', '❌ No']].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => { setWorked(val); if (val === 'yes') setSeverity(null) }}
                    style={{
                      flex: 1, padding: '5px', fontSize: '12px', cursor: 'pointer',
                      borderRadius: '6px', border: '1px solid',
                      borderColor: worked === val ? '#6366f1' : '#444',
                      background: worked === val ? '#3730a3' : '#0f0f1a',
                      color: '#f0f0f0',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {worked && worked !== 'yes' && (
                <>
                  <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '6px' }}>
                    Severity?
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                    {[['broken', '🔴 Broken'], ['annoying', '🟡 Annoying'], ['minor', '🟢 Minor']].map(([val, label]) => (
                      <button
                        key={val}
                        onClick={() => setSeverity(val)}
                        style={{
                          flex: 1, padding: '5px', fontSize: '11px', cursor: 'pointer',
                          borderRadius: '6px', border: '1px solid',
                          borderColor: severity === val ? '#6366f1' : '#444',
                          background: severity === val ? '#3730a3' : '#0f0f1a',
                          color: '#f0f0f0',
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </>
              )}
              <button
                onClick={submit}
                disabled={!worked}
                style={{
                  width: '100%', padding: '8px', borderRadius: '6px',
                  background: worked ? '#6366f1' : '#333', color: '#fff',
                  border: 'none', cursor: worked ? 'pointer' : 'not-allowed',
                  fontSize: '13px', fontWeight: 600,
                }}
              >
                Send Feedback
              </button>
            </>
          )}
        </div>
      )}
    </>
  )
}
