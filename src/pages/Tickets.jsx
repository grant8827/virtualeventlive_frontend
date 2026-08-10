import { useState, useEffect } from 'react'
import { apiUrl, mediaUrl } from '../api/url'
import TicketCard from '../components/TicketCard'
import SaleCard from '../components/SaleCard'

export default function Tickets() {
  const [events, setEvents] = useState([])
  const [eventsLoading, setEventsLoading] = useState(true)

  const [email, setEmail] = useState('')
  const [myTickets, setMyTickets] = useState(null)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupError, setLookupError] = useState('')
  const [showFindModal, setShowFindModal] = useState(false)

  useEffect(() => {
    fetch(apiUrl('/api/v1/events/public'))
      .then((r) => r.json())
      .then((d) => setEvents(d.events || []))
      .catch(() => {})
      .finally(() => setEventsLoading(false))
  }, [])

  async function handleLookup(e) {
    e.preventDefault()
    setLookupError('')
    setMyTickets(null)
    setLookupLoading(true)
    try {
      const res = await fetch(apiUrl(`/api/v1/tickets/lookup?email=${encodeURIComponent(email)}`))
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Lookup failed')
      setMyTickets(data.tickets || [])
      setShowFindModal(false)
    } catch (err) {
      setLookupError(err.message)
    } finally {
      setLookupLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">

      <div className="flex items-start justify-between gap-4 mb-10">
        <div>
          <h1 className="text-4xl font-extrabold mb-2">Tickets</h1>
          <p className="text-gray-400">Find your tickets or discover your next event.</p>
        </div>
        <button
          onClick={() => { setLookupError(''); setShowFindModal(true) }}
          className="shrink-0 bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-full text-sm font-semibold transition-colors"
        >
          Find My Tickets
        </button>
      </div>

      {myTickets !== null && (
        <section className="mb-14">
          {myTickets.length === 0 ? (
            <p className="text-gray-500 text-center py-10">No tickets found.</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {myTickets.map((ticket) => (
                <TicketCard
                  key={ticket.id}
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
                  expired={ticket.event_expired}
                  joinHref={!ticket.event_expired ? `/events/${ticket.event_id}/watch?code=${encodeURIComponent(ticket.access_token)}` : undefined}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Browse events */}
      <section>
        <div className="mb-8">
          <h2 className="text-3xl font-extrabold mb-2">Upcoming Events</h2>
          <p className="text-gray-400">Get your tickets before they sell out.</p>
        </div>

        {eventsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden animate-pulse">
                <div className="h-36 bg-gray-800" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-gray-800 rounded w-3/4" />
                  <div className="h-3 bg-gray-800 rounded w-1/2" />
                  <div className="h-9 bg-gray-800 rounded-xl mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-gray-800 rounded-2xl">
            <div className="text-5xl mb-4">🎟️</div>
            <p className="text-gray-400 text-lg font-medium mb-1">No upcoming events yet</p>
            <p className="text-gray-600 text-sm">Check back soon — events are added regularly.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {events.map((ev) => (
              <SaleCard
                key={ev.id}
                title={ev.title}
                starts_at={ev.starts_at}
                ticket_price={ev.ticket_price}
                ticket_type={ev.ticket_type}
                card_bg_from={ev.card_bg_from}
                card_bg_to={ev.card_bg_to}
                card_bg_image={mediaUrl(ev.card_bg_image)}
                ctaHref={`/events/${ev.id}`}
              />
            ))}
          </div>
        )}
      </section>

      {showFindModal && (
        <FindTicketsModal
          email={email}
          setEmail={setEmail}
          loading={lookupLoading}
          error={lookupError}
          onSubmit={handleLookup}
          onClose={() => setShowFindModal(false)}
        />
      )}
    </div>
  )
}

function FindTicketsModal({ email, setEmail, loading, error, onSubmit, onClose }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-7 shadow-2xl">
        <h2 className="text-xl font-bold mb-1">Find My Tickets</h2>
        <p className="text-gray-400 text-sm mb-5">Enter the email used to purchase your tickets.</p>
        <form onSubmit={onSubmit}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoFocus
            required
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500"
          />
          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl mt-4 transition-colors"
          >
            {loading ? 'Searching…' : 'Search for Tickets'}
          </button>
        </form>
        <button onClick={onClose} className="w-full text-gray-500 hover:text-gray-300 text-sm mt-4">Cancel</button>
      </div>
    </div>
  )
}
