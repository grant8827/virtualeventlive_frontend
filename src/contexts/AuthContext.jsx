import { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
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
    localStorage.setItem('vel_user', JSON.stringify(data))
    localStorage.setItem('token', data.token)
    setUser(data)
    setSessionExpired(false)
  }

  async function login(email, password) {
    const data = await api.post('/auth/login', { email, password })
    saveUser(data)
    return data
  }

  async function register(email, password, role) {
    return api.post('/auth/register', { email, password, role })
  }

  function logout() {
    localStorage.removeItem('vel_user')
    localStorage.removeItem('token')
    setUser(null)
    setSessionExpired(false)
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, sessionExpired }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
