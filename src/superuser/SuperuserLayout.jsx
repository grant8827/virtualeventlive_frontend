import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const NAV_ITEMS = [
  { to: 'overview', label: '📊 Overview' },
  { to: 'users', label: '👥 Users' },
  { to: 'events', label: '🎟 Events' },
]

const linkClass = ({ isActive }) =>
  `block text-sm font-medium py-2 px-3 rounded-lg transition-colors ${
    isActive ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
  }`

// Platform dashboard shell — same look as the host dashboard, but for
// superusers managing every account and event.
export default function SuperuserLayout() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:w-56 border-r border-gray-800 bg-surface-nav z-20">
        <Link to="/" className="block px-5 py-4 border-b border-gray-800 shrink-0">
          <span className="flex items-center gap-2">
            <span className="bg-white rounded-lg p-1 flex items-center justify-center shrink-0">
              <img src="/logo-icon.png" alt="Virtual Event Plus" className="h-6 w-auto" />
            </span>
          </span>
          <p className="text-xs text-gray-500 mt-0.5">Superuser</p>
        </Link>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-gray-800 shrink-0">
          <p className="text-xs text-gray-600 truncate mb-2 px-1">{user?.email}</p>
          <button
            onClick={handleLogout}
            className="w-full text-left text-sm text-gray-400 hover:text-white hover:bg-gray-800 py-2 px-3 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-20 bg-surface-nav border-b border-gray-800">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center" aria-label="Virtual Event Plus">
            <span className="bg-white rounded-lg p-1 flex items-center justify-center shrink-0">
              <img src="/logo-icon.png" alt="Virtual Event Plus" className="h-6 w-auto" />
            </span>
          </Link>
          <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-white transition-colors">
            Logout
          </button>
        </div>
        <nav className="flex gap-1 px-2 pb-2 overflow-x-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `text-sm font-medium py-1.5 px-3 rounded-lg transition-colors whitespace-nowrap ${
                  isActive ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="md:ml-56">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Superuser Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">Every account, event and sale on the platform.</p>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
