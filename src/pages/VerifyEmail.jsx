import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'

// Opened from a verification email (/verify-email?token=…): confirms a new
// account's email, or a change to a new address.
export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [result, setResult] = useState(token ? null : { ok: false, message: 'This verification link is missing its code.' })
  const sent = useRef(false)

  useEffect(() => {
    if (!token || sent.current) return
    sent.current = true // links are single-use; don't submit twice
    api
      .post('/auth/verify-email', { token })
      .then((data) => setResult({ ok: true, message: data.message }))
      .catch((err) => setResult({ ok: false, message: err.message }))
  }, [token])

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center space-y-4">
        {!result ? (
          <p className="text-gray-400 text-sm">Confirming your email…</p>
        ) : (
          <>
            <h1 className="text-2xl font-bold">{result.ok ? 'Email confirmed' : 'Link not valid'}</h1>
            <p className="text-gray-400 text-sm leading-relaxed">{result.message}</p>
            <Link to="/login" className="inline-block text-purple-400 hover:text-purple-300 underline text-sm">
              Go to sign in
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
