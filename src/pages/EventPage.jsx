import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../api/client'

export default function EventPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showBuyModal, setShowBuyModal] = useState(false)
  const [passkey, setPasskey] = useState(null) // set when bypass ticket created

  useEffect(() => {
    api.get(`/events/${id}`)
      .then(setEvent)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-500">Loading event…</div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-500">Event not found.</div>
      </div>
    )
  }

  const isLive = event.is_active && event.aws_playback_url
  const price = event.ticket_price > 0
    ? `$${Number(event.ticket_price).toFixed(2)}`
    : 'Free'

  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      {isLive && (
        <div className="mb-6 flex items-center gap-3 bg-red-950 border border-red-800 rounded-2xl px-5 py-3">
          <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          <span className="text-red-300 text-sm font-semibold tracking-wide">LIVE NOW</span>
          <button
            onClick={() => navigate(`/events/${id}/watch`)}
            className="ml-auto text-sm bg-red-600 hover:bg-red-700 text-white px-5 py-1.5 rounded-full font-medium transition-colors"
          >
            Watch Live →
          </button>
        </div>
      )}

      <h1 className="text-4xl font-bold mb-3">{event.title}</h1>
      {event.description && <p className="text-gray-400 text-lg mb-6">{event.description}</p>}

      <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-10">
        <span>Starts: {new Date(event.starts_at).toLocaleString()}</span>
        {event.ends_at && <span>Ends: {new Date(event.ends_at).toLocaleString()}</span>}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-sm">
        {event.expired ? (
          <>
            <p className="text-gray-400 font-semibold mb-1">This event has ended</p>
            <p className="text-gray-600 text-sm">Tickets are no longer available.</p>
          </>
        ) : (
          <>
            <p className="text-3xl font-bold mb-1">{price}</p>
            <p className="text-gray-500 text-sm mb-5">per ticket · secure checkout</p>
            <button
              onClick={() => setShowBuyModal(true)}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-xl font-semibold transition-colors"
            >
              Get Ticket
            </button>
          </>
        )}
      </div>

      {showBuyModal && (
        <BuyModal
          eventId={id}
          eventTitle={event.title}
          onClose={() => setShowBuyModal(false)}
          onPasskey={(token) => {
            setShowBuyModal(false)
            setPasskey(token)
          }}
        />
      )}

      {passkey && (
        <PasskeyModal
          passkey={passkey}
          eventId={id}
          onClose={() => setPasskey(null)}
        />
      )}
    </main>
  )
}

function BuyModal({ eventId, eventTitle, onClose, onPasskey }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/v1/tickets/guest-purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId, email: email.trim().toLowerCase() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Purchase failed')

      if (data.checkout_url) {
        // Real Stripe — save email so success page can look up the ticket
        sessionStorage.setItem('vel_ticket_email', email.trim().toLowerCase())
        window.location.href = data.checkout_url
      } else if (data.access_token) {
        // Bypass / free — show passkey immediately
        onPasskey(data.access_token)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-8 shadow-2xl">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold">Get Your Ticket</h2>
            <p className="text-gray-400 text-sm mt-1 line-clamp-1">{eventTitle}</p>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors ml-4 shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 font-medium mb-1.5 uppercase tracking-wide">
              Your email address
            </label>
            <input
              ref={inputRef}
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError('') }}
              placeholder="you@example.com"
              required
              className="w-full bg-gray-800 border border-gray-700 focus:border-purple-500 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none transition-colors"
            />
            <p className="text-gray-600 text-xs mt-1.5">Your ticket and access code will be sent here.</p>
          </div>

          {error && (
            <p className="text-red-400 text-sm flex items-center gap-1.5">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Processing…
              </>
            ) : 'Continue to Checkout'}
          </button>
        </form>
      </div>
    </div>
  )
}

function PasskeyModal({ passkey, eventId, onClose }) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-8 shadow-2xl text-center">
        <div className="w-16 h-16 rounded-full bg-purple-900/50 border border-purple-700 flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a3 3 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold mb-1">You're In!</h2>
        <p className="text-gray-400 text-sm mb-6">
          Your ticket has been confirmed. Save your access code below — you'll need it to enter the event.
          A copy has also been sent to your email.
        </p>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-4">
          <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-2">Your Access Code</p>
          <p className="font-mono text-white text-sm break-all leading-relaxed">{passkey}</p>
        </div>

        <button
          onClick={copyCode}
          className="w-full mb-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {copied ? (
            <>
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              <span className="text-green-400">Copied!</span>
            </>
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
          onClick={() => { onClose(); navigate(`/events/${eventId}/watch?code=${encodeURIComponent(passkey)}`) }}
          className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-2.5 rounded-xl transition-colors"
        >
          Go to Event
        </button>
      </div>
    </div>
  )
}
