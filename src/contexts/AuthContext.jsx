import { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../api/client'

const AuthContext = createContext(null)

// The session itself lives in an HttpOnly cookie; this context only keeps
// non-sensitive display info (id/email/role) and confirms it with the server.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    // Tokens from before the cookie-session change are dropped on load.
    localStorage.removeItem('token')
    try {
      const stored = localStorage.getItem('vel_user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })
  const [sessionExpired, setSessionExpired] = useState(false)

  useEffect(() => {
    function onExpired() {
      setUser(null)
      setSessionExpired(true)
    }
    window.addEventListener('auth:expired', onExpired)
    return () => window.removeEventListener('auth:expired', onExpired)
  }, [])

  function saveUser(data) {
    const profile = { id: data.id, email: data.email, role: data.role }
    localStorage.setItem('vel_user', JSON.stringify(profile))
    setUser(profile)
    setSessionExpired(false)
  }

  // Confirm the cached user with the server (the cookie may have expired or
  // been revoked elsewhere); a 401 signs the app out via auth:expired.
  useEffect(() => {
    if (!localStorage.getItem('vel_user')) return
    api
      .get('/auth/me')
      .then((me) => saveUser({ id: me.id, email: me.email, role: me.role }))
      .catch(() => {})
  }, [])

  async function login(email, password) {
    const data = await api.post('/auth/login', { email, password })
    saveUser(data)
    return data
  }

  async function register(payload) {
    return api.post('/auth/register', payload)
  }

  // Revokes the session on the server (the cookie alone can't be cleared by
  // page scripts) and clears the cached profile.
  function logout() {
    api.post('/auth/logout').catch(() => {})
    localStorage.removeItem('vel_user')
    setUser(null)
    setSessionExpired(false)
  }

  // Patches the locally-cached user (e.g. after a profile edit changes the
  // email) without a re-login round trip.
  function updateUser(patch) {
    setUser((u) => {
      if (!u) return u
      const next = { ...u, ...patch }
      localStorage.setItem('vel_user', JSON.stringify(next))
      return next
    })
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateUser, sessionExpired }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
