import { useState, useEffect, useRef } from 'react'
import { apiUrl } from '../api/url'

// "Find My Tickets" emails the buyer their tickets instead of showing them
// here, so access codes only ever reach the inbox owner. The reply is the
// same whether or not the address has tickets.
export default function FindMyTicketsModal({ onClose }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
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
    setSent('')
    setLoading(true)
    try {
      const res = await fetch(apiUrl('/api/v1/tickets/lookup'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.')
      setSent(data.message)
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
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800">
          <div>
            <h2 className="text-lg font-bold">Find My Tickets</h2>
            <p className="text-gray-400 text-xs mt-0.5">We'll email your tickets and access codes to you.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-gray-600 hover:text-white transition-colors ml-4 shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5">
          {sent ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">📬</div>
              <p className="text-gray-300 text-sm leading-relaxed">{sent}</p>
              <button onClick={onClose} className="mt-5 text-sm text-purple-400 hover:text-purple-300">
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleLookup} className="flex gap-2">
              <input
                ref={inputRef}
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError('') }}
                placeholder="your@email.com"
                required
                className="flex-1 bg-gray-800 border border-gray-700 focus:border-purple-500 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none transition-colors text-sm"
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors whitespace-nowrap"
              >
                {loading ? 'Sending…' : 'Email my tickets'}
              </button>
            </form>
          )}
          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
        </div>
      </div>
    </div>
  )
}
