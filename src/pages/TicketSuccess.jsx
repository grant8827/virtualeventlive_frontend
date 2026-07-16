import { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { apiUrl } from '../api/url'

export default function TicketSuccess() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const urlEmail = params.get('email')
  const email = urlEmail || sessionStorage.getItem('vel_ticket_email') || ''

  const [passkey, setPasskey] = useState(null)
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
          setPasskey(tickets[0].access_token)
        }
      } catch {}
    }

    poll() // immediate first attempt
    pollRef.current = setInterval(poll, 2000)
    return () => clearInterval(pollRef.current)
  }, [email])

  return (
    <div className="min-h-[70vh] flex items-center justify-center text-center px-4">
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

        {polling && !passkey && (
          <div className="flex items-center justify-center gap-2 text-gray-500 text-sm mt-4 mb-6">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Fetching your access code…
          </div>
        )}

        {passkey && <PasskeyCard passkey={passkey} navigate={navigate} />}

        {!passkey && !polling && (
          <p className="text-gray-500 text-sm mt-4 mb-6">
            Your access code will be in your email — check your inbox.
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
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
    </div>
  )
}

function PasskeyCard({ passkey, navigate }) {
  const [copied, setCopied] = useState(false)

  function copyCode() {
    navigator.clipboard.writeText(passkey).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="bg-gray-900 border border-purple-800 rounded-2xl p-6 mt-6 text-left">
      <p className="text-xs text-purple-400 uppercase tracking-widest font-bold mb-3">Your Access Code</p>
      <p className="font-mono text-white text-sm break-all leading-relaxed mb-4">{passkey}</p>
      <div className="flex gap-2">
        <button
          onClick={copyCode}
          className="flex-1 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white text-sm font-medium py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5"
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
          onClick={() => navigate('/')}
          className="flex-1 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold py-2 rounded-xl transition-colors"
        >
          Go to Event
        </button>
      </div>
      <p className="text-gray-600 text-xs mt-3">Use this code on the Home page → "Go to Event" to join.</p>
    </div>
  )
}
