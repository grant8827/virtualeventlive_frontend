import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { apiUrl } from '../api/url'
import AdCard from '../components/AdCard'

export default function Home() {
  const [ads, setAds] = useState([])
  const [showEnterModal, setShowEnterModal] = useState(false)

  useEffect(() => {
    api.get('/advertisements')
      .then((d) => setAds(d.ads || []))
      .catch(() => {})
  }, [])

  return (
    <main className="overflow-x-hidden">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-175 h-100 bg-purple-700/20 rounded-full blur-[120px]" />
        </div>

        <div className="relative max-w-5xl mx-auto px-6 pt-24 pb-10 text-center">
          <div className="inline-flex items-center gap-2 bg-purple-950 border border-purple-800 text-purple-300 text-xs px-3 py-1 rounded-full mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            Professional Virtual Event Platform
          </div>

          <h1 className="text-6xl sm:text-7xl font-extrabold mb-6 leading-tight tracking-tight">
            Stream. Ticket.{' '}
            <span className="text-transparent bg-clip-text bg-linear-to-r from-purple-400 to-violet-300">
              Earn.
            </span>
          </h1>

          <p className="text-gray-400 text-xl mb-12 max-w-2xl mx-auto leading-relaxed">
            Host professional virtual events with browser-based live streaming,
            instant ticketing, and same-day payouts.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="w-full sm:w-auto bg-purple-600 hover:bg-purple-500 text-white px-8 py-4 rounded-2xl text-base font-semibold transition-all shadow-lg shadow-purple-900/40 hover:shadow-purple-700/50 hover:-translate-y-0.5"
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                </svg>
                Host Your Event
              </span>
              <span className="block text-purple-300 text-xs font-normal mt-0.5">Go live in minutes</span>
            </Link>

            <Link
              to="/tickets"
              className="w-full sm:w-auto bg-gray-900 hover:bg-gray-800 border border-gray-700 hover:border-purple-600 text-white px-8 py-4 rounded-2xl text-base font-semibold transition-all hover:-translate-y-0.5"
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a3 3 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
                </svg>
                Get Tickets
              </span>
              <span className="block text-gray-500 text-xs font-normal mt-0.5">Browse upcoming events</span>
            </Link>

            <button
              onClick={() => setShowEnterModal(true)}
              className="w-full sm:w-auto bg-gray-900 hover:bg-gray-800 border border-gray-700 hover:border-violet-500 text-white px-8 py-4 rounded-2xl text-base font-semibold transition-all hover:-translate-y-0.5"
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347c-.75.412-1.667-.13-1.667-.986V5.653z" />
                </svg>
                Go to Event
              </span>
              <span className="block text-gray-500 text-xs font-normal mt-0.5">Enter your ticket code</span>
            </button>
          </div>
        </div>
      <hr/>
      </section>

      {/* ── Featured Events ── */}
      {ads.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-15">
          <div className="flex items-center gap-3 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Featured Events</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {ads.slice(0, 6).map((ad) => (
              <AdCard key={ad.id} {...ad} />
            ))}
          </div>
          <div className="text-center mt-10">
            <Link
              to="/events"
              className="inline-block bg-gray-900 hover:bg-gray-800 border border-gray-700 hover:border-purple-600 text-white px-6 py-3 rounded-xl text-sm font-semibold transition-colors"
            >
              Browse All Events
            </Link>
          </div>
        </section>
      )}

      {/* ── How It Works ── */}
      <section className="relative py-24 px-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-175 h-64 bg-violet-800/10 rounded-full blur-[80px]" />
        </div>
        <div className="relative max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-purple-400 text-sm font-semibold uppercase tracking-widest mb-3">Simple process</p>
            <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight">How it works</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connector line (desktop only) */}
            <div className="hidden md:block absolute top-8 left-1/3 right-1/3 h-px bg-linear-to-r from-purple-600/0 via-purple-600/40 to-purple-600/0" />

            {[
              {
                step: '01',
                title: 'Book Your Slot',
                body: 'Pick your date and time, choose your event type, and secure your virtual venue for just $20/hr.',
                color: 'from-purple-600 to-violet-600',
              },
              {
                step: '02',
                title: 'Set Up Tickets',
                body: 'Design your ticket card, set your price, and publish — buyers get a unique access code via email.',
                color: 'from-violet-600 to-fuchsia-600',
              },
              {
                step: '03',
                title: 'Go Live & Earn',
                body: 'Stream from your browser with one click. Payouts land in your Stripe account the same day.',
                color: 'from-fuchsia-600 to-pink-600',
              },
            ].map((s) => (
              <div key={s.step} className="relative text-center md:text-left">
                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-linear-to-br ${s.color} mb-5 shadow-lg`}>
                  <span className="text-white font-black text-lg">{s.step}</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{s.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature Bento Grid ── */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="text-center mb-12">
          <p className="text-purple-400 text-sm font-semibold uppercase tracking-widest mb-3">Everything you need</p>
          <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight">Built for creators</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Large feature card */}
          <div className="lg:col-span-2 relative overflow-hidden bg-gray-900/60 border border-white/5 rounded-3xl p-8 group hover:border-purple-500/20 transition-all duration-300">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 rounded-full blur-[60px] pointer-events-none" />
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-purple-900/80 border border-purple-700/50 flex items-center justify-center mb-5">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Browser Studio</h3>
              <p className="text-gray-400 text-sm leading-relaxed max-w-md">
                Go live from your browser with zero installs. Switch cameras, share your screen, overlay tickers and
                graphics — everything you need for a professional broadcast.
              </p>
              <div className="flex flex-wrap gap-2 mt-5">
                {['Multi-camera', 'Screen share', 'Live ticker', 'No software'].map((tag) => (
                  <span key={tag} className="text-xs bg-purple-950/80 border border-purple-800/50 text-purple-300 px-3 py-1 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Tall card */}
          <div className="relative overflow-hidden bg-gray-900/60 border border-white/5 rounded-3xl p-8 group hover:border-violet-500/20 transition-all duration-300">
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-600/10 rounded-full blur-[50px] pointer-events-none" />
            <div className="relative h-full flex flex-col">
              <div className="w-12 h-12 rounded-2xl bg-violet-900/80 border border-violet-700/50 flex items-center justify-center mb-5">
                <svg className="w-6 h-6 text-violet-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a3 3 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Instant Ticketing</h3>
              <p className="text-gray-400 text-sm leading-relaxed flex-1">
                Design a custom ticket card with gradient colors and branding. Buyers purchase with just their email — no account needed.
              </p>
              <div className="mt-6 bg-gray-800/60 border border-white/5 rounded-xl p-3 text-xs text-gray-500">
                <p className="text-green-400 font-semibold mb-0.5">✓ Ticket confirmed</p>
                <p>Access code sent to your inbox</p>
              </div>
            </div>
          </div>

          {/* Payout card */}
          <div className="relative overflow-hidden bg-gray-900/60 border border-white/5 rounded-3xl p-8 group hover:border-emerald-500/20 transition-all duration-300">
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-600/8 rounded-full blur-[50px] pointer-events-none" />
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-emerald-900/50 border border-emerald-800/50 flex items-center justify-center mb-5">
                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Same-Day Payouts</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Connected to Stripe — funds hit your account the same day your event ends, no waiting period.
              </p>
            </div>
          </div>

          {/* Access control card */}
          <div className="relative overflow-hidden bg-gray-900/60 border border-white/5 rounded-3xl p-8 group hover:border-fuchsia-500/20 transition-all duration-300">
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-fuchsia-700/8 rounded-full blur-[40px] pointer-events-none" />
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-fuchsia-900/50 border border-fuchsia-800/50 flex items-center justify-center mb-5">
                <svg className="w-6 h-6 text-fuchsia-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Secure Access</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Each ticket generates a unique access code. One device per ticket — no sharing, no piracy.
              </p>
            </div>
          </div>

          {/* CTA card */}
          <div className="relative overflow-hidden rounded-3xl p-8"
            style={{ background: 'linear-gradient(135deg, #581c87 0%, #4c1d95 50%, #2e1065 100%)' }}
          >
            <div className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                backgroundSize: '24px 24px',
              }}
            />
            <div className="relative flex flex-col h-full justify-between">
              <div>
                <p className="text-purple-200 text-xs font-semibold uppercase tracking-widest mb-3">Ready to host?</p>
                <h3 className="text-2xl font-black text-white mb-2">Start for free</h3>
                <p className="text-purple-200/70 text-sm leading-relaxed">
                  Create your account in 60 seconds. No credit card required until your first event.
                </p>
              </div>
              <Link
                to="/register"
                className="mt-6 inline-flex items-center justify-center gap-2 bg-white text-purple-900 font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-purple-50 transition-colors"
              >
                Get Started →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Enter event modal */}
      {showEnterModal && <EnterEventModal onClose={() => setShowEnterModal(false)} />}
    </main>
  )
}

function EnterEventModal({ onClose }) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmed = code.trim()
    if (!trimmed) return
    setError('')
    setLoading(true)
    try {
      const res = await fetch(apiUrl(`/api/v1/tickets/enter?code=${encodeURIComponent(trimmed)}`))
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ticket not found')
      onClose()
      navigate(`/events/${data.event_id}/watch?code=${encodeURIComponent(trimmed)}`)
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold">Enter Your Ticket Code</h2>
            <p className="text-gray-400 text-sm mt-1">Paste the access code from your ticket to join the event.</p>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors ml-4 shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            ref={inputRef}
            type="text"
            value={code}
            onChange={(e) => { setCode(e.target.value); setError('') }}
            placeholder="e.g. TCK-8f3a2b1c…"
            className="w-full bg-gray-800 border border-gray-700 focus:border-purple-500 rounded-xl px-4 py-3 text-white placeholder-gray-600 font-mono text-sm focus:outline-none transition-colors"
          />

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
            disabled={loading || !code.trim()}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Verifying…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347c-.75.412-1.667-.13-1.667-.986V5.653z" />
                </svg>
                Join Event
              </>
            )}
          </button>
        </form>

        <p className="text-gray-600 text-xs text-center mt-5">
          Don't have a ticket?{' '}
          <Link to="/tickets" onClick={onClose} className="text-purple-400 hover:text-purple-300 transition-colors">
            Browse events
          </Link>
        </p>
      </div>
    </div>
  )
}
