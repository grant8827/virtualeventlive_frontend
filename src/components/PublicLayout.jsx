import { Outlet } from 'react-router-dom'
import NavBar from './NavBar'
import Footer from './Footer'

// Wraps every public/marketing route (home, events, login, tickets…) in the
// site chrome. The dashboard deliberately does NOT use this — it renders
// its own header + sidebar instead, see DashboardLayout.
export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <NavBar />
      <div className="flex-1">
        <Outlet />
      </div>
      <Footer />
    </div>
  )
}
