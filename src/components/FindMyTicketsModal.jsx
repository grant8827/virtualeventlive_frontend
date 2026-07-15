import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function FindMyTicketsModal({ onClose }) {
  const [email, setEmail] = useState('')
  const [tickets, setTickets] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [visibleCode, setVisibleCode] = useState(null) // ticket id whose code is expanded
  const [copied, setCopied] = useState(false)
  const navigate = useNavigate()
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleLookup(e) {
    e.preventDefault()
    setError('')
    setTickets(null)
    setVisibleCode(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/tickets/lookup?email=${encodeURIComponent(email.trim())}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Lookup failed')
      setTickets(data.tickets || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function copyCode(token) {
    navigator.clipboard.writeText(token).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function goToEvent() {
    onClose()
    navigate('/')
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('vel:open-enter-modal'))
    }, 100)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800">
          <div>
            <h2 className="text-lg font-bold">Find My Tickets</h2>
            <p className="text-gray-400 text-xs mt-0.5">Enter your email to retrieve your tickets and access codes.</p>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors ml-4 shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <form onSubmit={handleLookup} className="flex gap-2 mb-5">
            <input
              ref={inputRef}
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); setTickets(null) }}
              placeholder="your@email.com"
              required
              className="flex-1 bg-gray-800 border border-gray-700 focus:border-purple-500 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none transition-colors text-sm"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors whitespace-nowrap flex items-center gap-1.5"
            >
              {loading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : 'Look Up'}
            </button>
          </form>

          {error && (
            <p className="text-red-400 text-sm mb-4 flex items-center gap-1.5">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {error}
            </p>
          )}

          {/* Results */}
          {tickets !== null && (
            tickets.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">🎟️</div>
                <p className="text-gray-400 text-sm">No tickets found for that email.</p>
                <p className="text-gray-600 text-xs mt-1">Check the email and try again.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {tickets.map((t) => (
                  <div key={t.id} className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                    {/* Ticket row */}
                    <div className="p-4 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm truncate">{t.event_title}</p>
                        <p className="text-gray-400 text-xs mt-0.5">
                          {new Date(t.event_starts_at).toLocaleString('en-US', {
                            weekday: 'short', month: 'short', day: 'numeric',
                            hour: 'numeric', minute: '2-digit', hour12: true,
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {t.event_is_active && (
                          <Link
                            to={`/events/${t.event_id}/watch`}
                            onClick={onClose}
                            className="text-xs bg-red-900 border border-red-700 text-red-300 px-2 py-1 rounded-full whitespace-nowrap"
                          >
                            ● LIVE
                          </Link>
                        )}
                        <button
                          onClick={() => setVisibleCode(visibleCode === t.id ? null : t.id)}
                          className="text-xs bg-purple-900 border border-purple-700 text-purple-300 hover:bg-purple-800 px-2.5 py-1 rounded-full whitespace-nowrap transition-colors"
                        >
                          {visibleCode === t.id ? 'Hide Code' : 'View Code'}
                        </button>
                      </div>
                    </div>

                    {/* Expanded passkey */}
                    {visibleCode === t.id && (
                      <div className="border-t border-gray-700 bg-gray-900 px-4 py-3">
                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-widest mb-2">Access Code</p>
                        <p className="font-mono text-white text-xs break-all leading-relaxed mb-3">{t.access_token}</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => copyCode(t.access_token)}
                            className="flex-1 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white text-xs font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                          >
                            {copied ? (
                              <><span className="text-green-400">✓</span><span className="text-green-400">Copied!</span></>
                            ) : (
                              <>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                                </svg>
                                Copy Code
                              </>
                            )}
                          </button>
                          <button
                            onClick={goToEvent}
                            className="flex-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
                          >
                            Go to Event
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
