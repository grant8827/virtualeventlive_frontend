import { useEffect } from 'react'
import { Link, NavLink, Outlet, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { DashboardProvider, useDashboard } from './DashboardContext'
import { hasFullAccess } from './roles'

// `staff: true` marks the pages staff members can see; the owner and admins
// see every item.
const NAV_ITEMS = [
  { to: 'setup', label: 'Book Event' },
  { to: 'events', label: 'My Events' },
  { to: 'golive', label: '🔴 Go Live', staff: true },
  { to: 'chat', label: '💬 Chat', staff: true },
  { to: 'tickets', label: 'Tickets/Flyer', staff: true },
  { to: 'scan', label: '📷 Scan Tickets', staff: true },
  { to: 'payouts', label: 'Payouts' },
]

export default function DashboardLayout() {
  return (
    <DashboardProvider>
      <DashboardShell />
    </DashboardProvider>
  )
}

function DashboardShell() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, logout, updateUser } = useAuth()
  const { activeEventCount } = useDashboard()
  const fullAccess = hasFullAccess(user)
  const navItems = fullAccess ? NAV_ITEMS : NAV_ITEMS.filter((item) => item.staff)

  // The cached role is from sign-in; pick up a staff/admin change made since.
  // A suspended or deleted user gets a 401 here and is signed out.
  useEffect(() => {
    api.get('/auth/me').then((me) => {
      if (me.role !== user?.role) updateUser({ role: me.role })
    }).catch(() => {})
  }, [])

  // Stripe/WiPay/PayPal checkout returns here as /dashboard?venue_paid=1|0.
  // Land the host on Go Live once the venue fee actually went through.
  useEffect(() => {
    const venuePaid = searchParams.get('venue_paid')
    if (venuePaid === null) return
    setSearchParams({}, { replace: true })
    if (venuePaid === '1') navigate('/dashboard/golive', { replace: true })
  }, [])

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Sidebar — pinned to the far-left edge of the viewport, full height */}
      <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:w-56 border-r border-gray-800 bg-surface-nav z-20">
        <Link to="/" className="block px-5 py-4 border-b border-gray-800 shrink-0">
          <span className="flex items-center gap-2">
            <span className="bg-white rounded-lg p-1 flex items-center justify-center shrink-0">
              <img src="/logo-icon.png" alt="Virtual Event Plus" className="h-6 w-auto" />
            </span>
          </span>
          <p className="text-xs text-gray-500 mt-0.5">Host Dashboard</p>
        </Link>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block text-sm font-medium py-2 px-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-gray-800 shrink-0">
          <p className="text-xs text-gray-600 truncate mb-2 px-1">{user?.email}</p>
          <NavLink
            to="profile"
            className={({ isActive }) =>
              `block text-sm font-medium py-2 px-3 rounded-lg transition-colors ${
                isActive ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`
            }
          >
            Profile
          </NavLink>
          {fullAccess && (
            <NavLink
              to="users"
              className={({ isActive }) =>
                `block text-sm font-medium py-2 px-3 rounded-lg transition-colors ${
                  isActive ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`
              }
            >
              Add User
            </NavLink>
          )}
          <button
            onClick={handleLogout}
            className="w-full text-left text-sm text-gray-400 hover:text-white hover:bg-gray-800 py-2 px-3 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile top bar — a full-height rail doesn't work on narrow screens */}
      <div className="md:hidden sticky top-0 z-20 bg-surface-nav border-b border-gray-800">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center" aria-label="Virtual Event Plus">
            <span className="bg-white rounded-lg p-1 flex items-center justify-center shrink-0">
              <img src="/logo-icon.png" alt="Virtual Event Plus" className="h-6 w-auto" />
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <NavLink to="profile" className="text-sm text-gray-400 hover:text-white transition-colors">
              Profile
            </NavLink>
            {fullAccess && (
              <NavLink to="users" className="text-sm text-gray-400 hover:text-white transition-colors">
                Add User
              </NavLink>
            )}
            <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-white transition-colors">
              Logout
            </button>
          </div>
        </div>
        <nav className="flex gap-1 px-2 pb-2 overflow-x-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `text-sm font-medium py-1.5 px-3 rounded-lg transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Page content — offset past the fixed sidebar on md+ */}
      <div className="md:ml-56">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Host Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">
              {activeEventCount} active event{activeEventCount !== 1 ? 's' : ''}
            </p>
          </div>

          <Outlet />
        </div>
      </div>
    </div>
  )
}
