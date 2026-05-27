import { createContext, useContext, useState, useEffect } from 'react'

const UserCtx = createContext(null)
export const useUser = () => useContext(UserCtx)

export function UserProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Use raw fetch — api() would redirect to Google on 401, but here
    // a 401 just means "not logged in" and we want to show SignInScreen instead.
    fetch('/auth/me', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) { setUser(d.user); setIsAdmin(!!d.isAdmin) }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <UserCtx.Provider value={{ user, isAdmin, loading, setUser }}>
      {children}
    </UserCtx.Provider>
  )
}
