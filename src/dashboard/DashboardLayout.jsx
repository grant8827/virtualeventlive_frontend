import { useEffect } from 'react'
import { Link, NavLink, Outlet, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { DashboardProvider, useDashboard } from './DashboardContext'

const NAV_ITEMS = [
  { to: 'setup', label: 'Book Event' },
  { to: 'events', label: 'My Events' },
  { to: 'golive', label: '🔴 Go Live' },
  { to: 'chat', label: '💬 Chat' },
  { to: 'tickets', label: 'Tickets/Flyer' },
  { to: 'scan', label: '📷 Scan Tickets' },
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
  const { user, logout } = useAuth()
  const { activeEventCount } = useDashboard()

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
              <img src="/logo-icon.png" alt="" className="h-6 w-auto" />
            </span>
            <span className="text-lg font-bold text-purple-400 tracking-tight">
              VirtualEvent<span className="text-white">Live</span>
            </span>
          </span>
          <p className="text-xs text-gray-500 mt-0.5">Host Dashboard</p>
        </Link>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
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
          <Link to="/" className="flex items-center gap-2">
            <span className="bg-white rounded-lg p-1 flex items-center justify-center shrink-0">
              <img src="/logo-icon.png" alt="" className="h-6 w-auto" />
            </span>
            <span className="text-lg font-bold text-purple-400 tracking-tight">
              VirtualEvent<span className="text-white">Live</span>
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
