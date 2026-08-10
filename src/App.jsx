import { Routes, Route, Navigate } from 'react-router-dom'
import PublicLayout from './components/PublicLayout'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
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

export default function App() {
  return (
    <Routes>
      {/* Public site — shared NavBar + Footer */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
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
          <ProtectedRoute role="host">
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="golive" replace />} />
        <Route path="setup" element={<BookEventPage />} />
        <Route path="events" element={<MyEventsPage />} />
        <Route path="golive" element={<GoLivePage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="tickets" element={<TicketsFlyerPage />} />
        <Route path="scan" element={<ScanTicketsPage />} />
        <Route path="payouts" element={<PayoutsPage />} />
      </Route>
    </Routes>
  )
}
