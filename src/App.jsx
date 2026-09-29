import { Routes, Route, Navigate } from 'react-router-dom'
import PublicLayout from './components/PublicLayout'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Events from './pages/Events'
import EventPage from './pages/EventPage'
import Watch from './pages/Watch'
import Tickets from './pages/Tickets'
import TicketSuccess from './pages/TicketSuccess'
import DashboardLayout from './dashboard/DashboardLayout'
import BookEventPage from './dashboard/pages/BookEventPage'
import MyEventsPage from './dashboard/pages/MyEventsPage'
import GoLivePage from './dashboard/pages/GoLivePage'
import ChatPage from './dashboard/pages/ChatPage'
import TicketsFlyerPage from './dashboard/pages/TicketsFlyerPage'
import ScanTicketsPage from './dashboard/pages/ScanTicketsPage'
import PayoutsPage from './dashboard/pages/PayoutsPage'
import ProfilePage from './dashboard/pages/ProfilePage'
import UsersPage from './dashboard/pages/UsersPage'
import { DASHBOARD_ROLES, FULL_ACCESS_ROLES } from './dashboard/roles'
import SuperuserLayout from './superuser/SuperuserLayout'
import OverviewPage from './superuser/pages/OverviewPage'
import SuperuserUsersPage from './superuser/pages/UsersPage'
import SuperuserEventsPage from './superuser/pages/EventsPage'

// Owner/admin-only dashboard pages; staff are bounced to Go Live.
function FullAccess({ children }) {
  return (
    <ProtectedRoute role={FULL_ACCESS_ROLES} redirectTo="/dashboard/golive">
      {children}
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <Routes>
      {/* Public site — shared NavBar + Footer */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/events" element={<Events />} />
        <Route path="/events/:id" element={<EventPage />} />
        <Route path="/events/:id/watch" element={<Watch />} />
        <Route path="/tickets" element={<Tickets />} />
        <Route path="/ticket-success" element={<TicketSuccess />} />
      </Route>

      {/* Host dashboard — its own header + sidebar, no site NavBar/Footer */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute role={DASHBOARD_ROLES}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="golive" replace />} />
        <Route path="setup" element={<FullAccess><BookEventPage /></FullAccess>} />
        <Route path="events" element={<FullAccess><MyEventsPage /></FullAccess>} />
        <Route path="golive" element={<GoLivePage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="tickets" element={<TicketsFlyerPage />} />
        <Route path="scan" element={<ScanTicketsPage />} />
        <Route path="payouts" element={<FullAccess><PayoutsPage /></FullAccess>} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="users" element={<FullAccess><UsersPage /></FullAccess>} />
      </Route>

      {/* Platform dashboard — superusers only */}
      <Route
        path="/superuser"
        element={
          <ProtectedRoute role="superuser">
            <SuperuserLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<OverviewPage />} />
        <Route path="users" element={<SuperuserUsersPage />} />
        <Route path="events" element={<SuperuserEventsPage />} />
      </Route>

      {/* Unknown URLs would otherwise render a blank page */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
