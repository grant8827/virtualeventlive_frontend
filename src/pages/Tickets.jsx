import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getObjectURL, imgKey } from '../lib/imageStore'

export default function Tickets() {
  const [events, setEvents] = useState([])
  const [eventsLoading, setEventsLoading] = useState(true)

  const [email, setEmail] = useState('')
  const [myTickets, setMyTickets] = useState(null)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupError, setLookupError] = useState('')
  const [activePasskey, setActivePasskey] = useState(null)

  useEffect(() => {
    fetch('/api/v1/events/public')
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
      const res = await fetch(`/api/v1/tickets/lookup?email=${encodeURIComponent(email)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Lookup failed')
      setMyTickets(data.tickets || [])
    } catch (err) {
      setLookupError(err.message)
    } finally {
      setLookupLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">

      {/* Find my tickets */}
      <section className="bg-gray-900 border border-gray-800 rounded-2xl p-8 mb-16">
        <h2 className="text-2xl font-bold mb-1">Find My Tickets</h2>
        <p className="text-gray-400 text-sm mb-6">Enter the email you used to purchase tickets.</p>

        <form onSubmit={handleLookup} className="flex gap-3 mb-6">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
          />
          <button
            type="submit"
            disabled={lookupLoading}
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-semibold transition-colors whitespace-nowrap"
          >
            {lookupLoading ? '…' : 'Look Up'}
          </button>
        </form>

        {lookupError && <p className="text-red-400 text-sm mb-4">{lookupError}</p>}

        {myTickets !== null && <TicketList tickets={myTickets} onViewCode={setActivePasskey} />}
      </section>

      {/* Browse events */}
      <section>
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold mb-2">Upcoming Events</h1>
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

      {activePasskey && (
        <PasskeyModal passkey={activePasskey} onClose={() => setActivePasskey(null)} />
      )}
    </div>
  )
}

function EventCard({ ev }) {
  const bgFrom = ev.card_bg_from || '#7c3aed'
  const bgTo   = ev.card_bg_to   || '#1e1b4b'
  const [localImage, setLocalImage] = useState(null)

  // Ticket card images live in this browser's IndexedDB, not the backend —
  // fall back to it so a host previewing their own site sees the image they uploaded.
  useEffect(() => {
    let objectURL = null
    let cancelled = false
    getObjectURL(imgKey(ev.id)).then((url) => {
      if (cancelled) return
      objectURL = url
      setLocalImage(url)
    })
    return () => {
      cancelled = true
      if (objectURL) URL.revokeObjectURL(objectURL)
    }
  }, [ev.id])

  const bgStyle = localImage
    ? { backgroundImage: `url(${localImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
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

function TicketList({ tickets, onViewCode }) {
  if (tickets.length === 0) {
    return <p className="text-gray-500 text-sm">No tickets found for that email address.</p>
  }
  return (
    <div className="space-y-3">
      {tickets.map((t) => (
        <div key={t.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="font-semibold truncate">{t.event_title}</p>
            <p className="text-gray-400 text-sm mt-0.5">
              {new Date(t.event_starts_at).toLocaleString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric',
                hour: 'numeric', minute: '2-digit', hour12: true,
              })}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {t.event_expired ? (
              <span className="text-xs bg-gray-800 border border-gray-700 text-gray-500 px-2.5 py-1 rounded-full whitespace-nowrap">
                Ended
              </span>
            ) : (
              t.event_is_active && (
                <Link
                  to={`/events/${t.event_id}/watch?code=${encodeURIComponent(t.access_token)}`}
                  className="text-xs bg-red-900 border border-red-700 text-red-300 px-2.5 py-1 rounded-full whitespace-nowrap"
                >
                  ● LIVE
                </Link>
              )
            )}
            <button
              onClick={() => onViewCode(t.access_token)}
              className="text-xs bg-purple-900 border border-purple-700 text-purple-300 hover:bg-purple-800 px-2.5 py-1 rounded-full whitespace-nowrap transition-colors"
            >
              View Code
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function PasskeyModal({ passkey, onClose }) {
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function copyCode() {
    navigator.clipboard.writeText(passkey).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-8 shadow-2xl text-center">
        <div className="w-14 h-14 rounded-full bg-purple-900/50 border border-purple-700 flex items-center justify-center mx-auto mb-5">
          <svg className="w-7 h-7 text-purple-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a3 3 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
          </svg>
        </div>

        <h2 className="text-xl font-bold mb-1">Your Access Code</h2>
        <p className="text-gray-400 text-sm mb-6">Use this code on the Home page → "Go to Event" to join the live stream.</p>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-4 text-left">
          <p className="font-mono text-white text-sm break-all leading-relaxed">{passkey}</p>
        </div>

        <div className="flex gap-2 mb-3">
          <button
            onClick={copyCode}
            className="flex-1 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white text-sm font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5"
          >
            {copied ? (
              <><span className="text-green-400">✓</span><span className="text-green-400">Copied!</span></>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                </svg>
                Copy Code
              </>
            )}
          </button>
          <button
            onClick={() => { onClose(); navigate('/') }}
            className="flex-1 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
          >
            Go to Event
          </button>
        </div>

        <button onClick={onClose} className="text-gray-600 hover:text-gray-400 text-sm transition-colors">
          Close
        </button>
      </div>
    </div>
  )
}
