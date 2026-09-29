import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import PasswordInput from '../components/PasswordInput'

const inputClass =
  'w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors'

// Opened from the emailed link (/reset-password?token=…).
export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  // null while checking, true when the link is usable, or an error message.
  const [linkState, setLinkState] = useState(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) return
    api
      .get(`/auth/password-resets/${encodeURIComponent(token)}`)
      .then(() => setLinkState(true))
      .catch((err) => setLinkState(err.message))
  }, [token])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError("Passwords don't match.")
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token, password })
      setDone(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const invalid = !token ? 'This reset link is missing its code. Request a new one.' : typeof linkState === 'string' ? linkState : ''

  if (done || invalid) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center space-y-4">
          <h1 className="text-2xl font-bold">{done ? 'Password updated' : 'Link not valid'}</h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            {done ? 'Your password has been reset. You can sign in with your new password.' : invalid}
          </p>
          <Link
            to={done ? '/login' : '/forgot-password'}
            className="inline-block text-purple-400 hover:text-purple-300 underline text-sm"
          >
            {done ? 'Go to sign in' : 'Request a new link'}
          </Link>
        </div>
      </div>
    )
  }

  if (linkState === null) {
    return <p className="min-h-[80vh] flex items-center justify-center text-gray-500 text-sm">Checking your link…</p>
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold mb-2 text-center">Choose a new password</h1>
        <p className="text-gray-400 text-center mb-8">At least 8 characters.</p>
        <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-2xl p-8 space-y-5">
          {error && (
            <div className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-xl px-4 py-3">{error}</div>
          )}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">New password</label>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoFocus
              autoComplete="new-password"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Confirm new password</label>
            <PasswordInput
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold transition-colors"
          >
            {loading ? 'Saving…' : 'Set new password'}
          </button>
        </form>
      </div>
    </div>
  )
}
