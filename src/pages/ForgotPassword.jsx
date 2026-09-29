import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'

const inputClass =
  'w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors'

// Asks for an email and sends a reset link. The answer is the same whether
// or not the email has an account.
export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold mb-2 text-center">Forgot your password?</h1>
        <p className="text-gray-400 text-center mb-8">We'll email you a link to choose a new one.</p>

        {sent ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center space-y-4">
            <p className="text-green-400 font-semibold">Check your email</p>
            <p className="text-gray-400 text-sm leading-relaxed">
              If an account exists for <span className="text-white">{email}</span>, a reset link is on its way. It
              expires in 1 hour. Don't see it? Check your spam folder.
            </p>
            <Link to="/login" className="inline-block text-purple-400 hover:text-purple-300 underline text-sm">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-2xl p-8 space-y-5">
            {error && (
              <div className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-xl px-4 py-3">{error}</div>
            )}
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold transition-colors"
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
            <p className="text-center text-sm text-gray-500">
              Remembered it?{' '}
              <Link to="/login" className="text-purple-400 hover:text-purple-300 underline">
                Sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
