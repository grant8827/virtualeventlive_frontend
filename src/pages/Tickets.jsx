import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { apiUrl } from '../api/url'
import { mediaUrl } from '../api/url'

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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {myTickets.map((ticket) => <TicketStub key={ticket.id} ticket={ticket} />)}
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
              <EventCard key={ev.id} ev={ev} />
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

function EventCard({ ev }) {
  const bgFrom = ev.card_bg_from || '#7c3aed'
  const bgTo   = ev.card_bg_to   || '#1e1b4b'
  const image = mediaUrl(ev.card_bg_image)
  const bgStyle = image
    ? { backgroundImage: `url(${image})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { backgroundImage: `linear-gradient(to bottom right, ${bgFrom}, ${bgTo})` }

  const dateStr = new Date(ev.starts_at).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
  const timeStr = new Date(ev.starts_at).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  })

  const price = ev.ticket_price > 0
    ? `$${Number(ev.ticket_price).toFixed(2)}`
    : 'Free'

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden flex flex-col hover:border-gray-600 transition-colors">
      <div
        style={bgStyle}
        className="h-36 flex items-end p-4"
      >
        <span className="bg-black/50 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full">
          {ev.ticket_type || 'Virtual Only'}
        </span>
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <h3 className="font-bold text-base leading-snug mb-2 line-clamp-2">{ev.title}</h3>

        <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          <span>{dateStr} · {timeStr}</span>
        </div>

        <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-5">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /><circle cx="12" cy="9" r="2.5" />
          </svg>
          <span>VirtualEventLive</span>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3">
          <span className="text-white font-bold text-lg">{price}</span>
          <Link
            to={`/events/${ev.id}`}
            className="bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors"
          >
            Get Tickets
          </Link>
        </div>
      </div>
    </div>
  )
}

function TicketStub({ ticket }) {
  const expired = ticket.event_expired
  const image = mediaUrl(ticket.card_bg_image)
  return (
    <div className={`relative overflow-hidden bg-gray-900 border border-gray-800 rounded-2xl ${expired ? 'opacity-55' : ''}`}>
      {image && (
        <div className="h-28 bg-gray-800 flex items-center justify-center overflow-hidden">
          <img src={image} alt="" className="w-full h-full object-contain" />
        </div>
      )}
      <div className="p-5 pb-4">
        <p className="text-purple-400 text-[10px] font-black tracking-widest mb-2">{expired ? 'EXPIRED' : 'ADMIT ONE'}</p>
        <h3 className="font-bold text-lg leading-snug line-clamp-2">{ticket.event_title}</h3>
        <p className="text-gray-500 text-xs font-semibold mt-1">
          {new Date(ticket.event_starts_at).toLocaleString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric',
            hour: 'numeric', minute: '2-digit', hour12: true,
          })}
        </p>
      </div>
      <div className="relative h-5 flex items-center">
        <span className="absolute -left-2 w-4 h-4 rounded-full bg-black" />
        <span className="w-full mx-3 border-t border-dashed border-gray-700" />
        <span className="absolute -right-2 w-4 h-4 rounded-full bg-black" />
      </div>
      <div className="px-5 pt-2 pb-5">
        <p className="text-gray-500 text-[10px] font-bold tracking-wider mb-1">ACCESS CODE</p>
        <p className="font-mono text-purple-300 text-sm font-bold truncate mb-4" title={ticket.access_token}>{ticket.access_token}</p>
        {!expired && (
          <Link
            to={`/events/${ticket.event_id}/watch?code=${encodeURIComponent(ticket.access_token)}`}
            className="block text-center bg-red-900 hover:bg-red-800 text-white text-xs font-extrabold tracking-wider py-2.5 rounded-full transition-colors"
          >
            JOIN
          </Link>
        )}
      </div>
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
