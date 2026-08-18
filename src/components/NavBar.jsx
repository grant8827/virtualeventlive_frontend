import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function NavBar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <nav className="border-b border-gray-800 px-6 py-3 bg-surface-nav">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Left — logo. The mark's background isn't transparent, so it sits in
            a white pill rather than directly on the dark nav. */}
        <Link to="/" className="flex items-center shrink-0" aria-label="VirtualEventLive">
          <span className="bg-white rounded-lg p-1 flex items-center justify-center shrink-0">
            <img src="/logo-icon.png" alt="VirtualEventLive" className="h-8 w-auto" />
          </span>
        </Link>

        {/* Center — primary nav */}
        <div className="flex items-center gap-8 text-sm font-medium">
          <Link to="/" className="text-gray-400 hover:text-white transition-colors">
            Home
          </Link>
          <Link
            to="/events"
            className="text-gray-400 hover:text-white transition-colors"
          >
            Events
          </Link>
          <Link
            to="/tickets"
            className="text-white hover:text-purple-400 transition-colors"
          >
            Tickets
          </Link>
        </div>

        {/* Right — auth */}
        <div className="flex items-center gap-4 text-sm shrink-0">
          {user ? (
            <>
              {user.role === 'host' && (
                <Link to="/dashboard" className="text-gray-300 hover:text-white transition-colors">
                  Dashboard
                </Link>
              )}
              <span className="text-gray-600 hidden sm:block">{user.email}</span>
              <button
                onClick={handleLogout}
                className="text-gray-400 hover:text-white transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-gray-300 hover:text-white transition-colors">
                Sign in
              </Link>
              <Link
                to="/register"
                className="bg-purple-600 hover:bg-purple-700 px-4 py-1.5 rounded-full text-white font-medium transition-colors"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
