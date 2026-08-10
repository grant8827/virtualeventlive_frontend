import { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { apiUrl, mediaUrl } from '../api/url'
import TicketCard from '../components/TicketCard'

export default function TicketSuccess() {
  const [params] = useSearchParams()
  const urlEmail = params.get('email')
  const email = urlEmail || sessionStorage.getItem('vel_ticket_email') || ''

  const [ticket, setTicket] = useState(null)
  const [polling, setPolling] = useState(!!email)
  const pollRef = useRef(null)
  const attemptsRef = useRef(0)

  useEffect(() => {
    if (!email) return
    sessionStorage.removeItem('vel_ticket_email')

    async function poll() {
      attemptsRef.current += 1
      if (attemptsRef.current > 15) {
        clearInterval(pollRef.current)
        setPolling(false)
        return
      }
      try {
        const res = await fetch(apiUrl(`/api/v1/tickets/lookup?email=${encodeURIComponent(email)}`))
        const data = await res.json()
        const tickets = data.tickets || []
        if (tickets.length > 0) {
          clearInterval(pollRef.current)
          setPolling(false)
          setTicket(tickets[0])
        }
      } catch {
        // transient network hiccup — the next poll tick retries
      }
    }

    poll() // immediate first attempt
    pollRef.current = setInterval(poll, 2000)
    return () => clearInterval(pollRef.current)
  }, [email])

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="text-7xl mb-6">🎟️</div>
        <h1 className="text-3xl font-bold mb-3">Payment Confirmed!</h1>
        <p className="text-gray-400 mb-2">
          {email ? (
            <>Your ticket is being sent to <strong className="text-white">{email}</strong>.</>
          ) : (
            'Your ticket is on its way to your email.'
          )}
        </p>

        {polling && !ticket && (
          <div className="flex items-center justify-center gap-2 text-gray-500 text-sm mt-4 mb-6">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Fetching your ticket…
          </div>
        )}

        {!ticket && !polling && (
          <p className="text-gray-500 text-sm mt-4 mb-6">
            Your ticket will be in your email — check your inbox.
          </p>
        )}
      </div>

      {ticket && (
        <div className="w-full mt-6 mb-6">
          <TicketCard
            title={ticket.event_title}
            starts_at={ticket.event_starts_at}
            ticket_price={ticket.ticket_price}
            ticket_type={ticket.ticket_type}
            venue_address={ticket.venue_address}
            card_bg_from={ticket.card_bg_from}
            card_bg_to={ticket.card_bg_to}
            card_bg_image={mediaUrl(ticket.card_bg_image)}
            code={ticket.access_token}
            serialNo={ticket.serial_no}
            used={!!ticket.checked_in_channel}
            usedChannel={ticket.checked_in_channel}
            joinHref={`/events/${ticket.event_id}/watch?code=${encodeURIComponent(ticket.access_token)}`}
          />
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          to="/tickets"
          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-full font-medium transition-colors"
        >
          Find My Tickets
        </Link>
        <Link
          to="/"
          className="border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white px-6 py-2.5 rounded-full transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  )
}
