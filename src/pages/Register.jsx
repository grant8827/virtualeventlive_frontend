import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const initialForm = {
  fullName: '',
  email: '',
  password: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
  organizationName: '',
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-sm text-gray-400 mb-1.5">
        {label}
        {required && <span className="text-purple-400"> *</span>}
      </label>
      {children}
    </div>
  )
}

const inputClass =
  'w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors'

export default function Register() {
  const { register, login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register({
        email: form.email,
        password: form.password,
        full_name: form.fullName,
        phone: form.phone,
        address_line1: form.addressLine1,
        address_line2: form.addressLine2,
        city: form.city,
        state: form.state,
        postal_code: form.postalCode,
        country: form.country,
        organization_name: form.organizationName,
      })
      await login(form.email, form.password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <h1 className="text-3xl font-bold mb-2 text-center">Become a host</h1>
        <p className="text-gray-400 text-center mb-8">Set up your host account to start selling tickets</p>
        <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-2xl p-8 space-y-5">
          {error && (
            <div className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <Field label="Full name" required>
            <input type="text" value={form.fullName} onChange={update('fullName')} required className={inputClass} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Email address" required>
              <input type="email" value={form.email} onChange={update('email')} required className={inputClass} />
            </Field>
            <Field label="Phone number" required>
              <input type="tel" value={form.phone} onChange={update('phone')} required className={inputClass} />
            </Field>
          </div>

          <Field label="Password" required>
            <input
              type="password"
              value={form.password}
              onChange={update('password')}
              required
              minLength={6}
              className={inputClass}
            />
          </Field>

          <Field label="Organization / company name">
            <input type="text" value={form.organizationName} onChange={update('organizationName')} className={inputClass} />
          </Field>

          <Field label="Address line 1" required>
            <input type="text" value={form.addressLine1} onChange={update('addressLine1')} required className={inputClass} />
          </Field>

          <Field label="Address line 2">
            <input type="text" value={form.addressLine2} onChange={update('addressLine2')} className={inputClass} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="City" required>
              <input type="text" value={form.city} onChange={update('city')} required className={inputClass} />
            </Field>
            <Field label="State / province" required>
              <input type="text" value={form.state} onChange={update('state')} required className={inputClass} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Postal code" required>
              <input type="text" value={form.postalCode} onChange={update('postalCode')} required className={inputClass} />
            </Field>
            <Field label="Country" required>
              <input type="text" value={form.country} onChange={update('country')} required className={inputClass} />
            </Field>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold transition-colors"
          >
            {loading ? 'Creating account…' : 'Create host account'}
          </button>
          <p className="text-center text-sm text-gray-400">
            Have an account?{' '}
            <Link to="/login" className="text-purple-400 hover:text-purple-300 underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
