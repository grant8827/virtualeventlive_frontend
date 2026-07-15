import { Routes, Route } from 'react-router-dom'
import NavBar from './components/NavBar'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Events from './pages/Events'
import EventPage from './pages/EventPage'
import Watch from './pages/Watch'
import Tickets from './pages/Tickets'
import TicketSuccess from './pages/TicketSuccess'
import DashboardPage from './dashboard/DashboardPage'

export default function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <NavBar />
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/:id" element={<EventPage />} />
          <Route path="/events/:id/watch" element={<Watch />} />
          <Route path="/tickets" element={<Tickets />} />
          <Route path="/ticket-success" element={<TicketSuccess />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute role="host">
                <DashboardPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
      <Footer />
    </div>
  )
}
