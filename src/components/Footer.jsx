import { useState } from 'react'
import { Link } from 'react-router-dom'
import FindMyTicketsModal from './FindMyTicketsModal'

export default function Footer() {
  const [showTickets, setShowTickets] = useState(false)
  const year = new Date().getFullYear()

  return (
    <>
      <footer className="border-t border-gray-800 bg-gray-950 mt-auto">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 mb-10">

            {/* Brand */}
            <div>
              <Link to="/" className="text-lg font-bold text-purple-400 tracking-tight">
                VirtualEvent<span className="text-white">Live</span>
              </Link>
              <p className="text-gray-500 text-sm mt-3 leading-relaxed">
                Professional virtual event streaming with instant ticketing and same-day payouts.
              </p>
            </div>

            {/* Attend */}
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Attend</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link to="/tickets" className="text-gray-500 hover:text-white transition-colors">
                    Browse Events
                  </Link>
                </li>
                <li>
                  <button
                    onClick={() => setShowTickets(true)}
                    className="text-gray-500 hover:text-white transition-colors text-left"
                  >
                    Find My Tickets
                  </button>
                </li>
              </ul>
            </div>

            {/* Host */}
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Host</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link to="/register" className="text-gray-500 hover:text-white transition-colors">
                    Create an Account
                  </Link>
                </li>
                <li>
                  <Link to="/dashboard" className="text-gray-500 hover:text-white transition-colors">
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="text-gray-500 hover:text-white transition-colors">
                    Sign In
                  </Link>
                </li>
              </ul>
            </div>

          </div>

          {/* Bottom bar */}
          <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600">
            <p>© {year} VirtualEventLive. All rights reserved.</p>
            <p>$20/hr venue · 10% platform commission per ticket</p>
          </div>
        </div>
      </footer>

      {showTickets && <FindMyTicketsModal onClose={() => setShowTickets(false)} />}
    </>
  )
}
