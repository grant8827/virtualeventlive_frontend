import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { useAuth } from '../../contexts/AuthContext'
import PasswordInput from '../../components/PasswordInput'

const emptyProfileForm = {
  email: '',
  fullName: '',
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

export default function ProfilePage() {
  const { user, updateUser } = useAuth()

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [form, setForm] = useState(emptyProfileForm)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileSaved, setProfileSaved] = useState(false)

  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' })
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSaved, setPasswordSaved] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setLoadError('')
      try {
        const data = await api.get('/auth/me')
        if (cancelled) return
        setForm({
          email: data.email || '',
          fullName: data.full_name || '',
          phone: data.phone || '',
          addressLine1: data.address_line1 || '',
          addressLine2: data.address_line2 || '',
          city: data.city || '',
          state: data.state || '',
          postalCode: data.postal_code || '',
          country: data.country || '',
          organizationName: data.organization_name || '',
        })
      } catch (err) {
        if (!cancelled) setLoadError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  function update(field) {
    return (e) => {
      setProfileSaved(false)
      setForm((f) => ({ ...f, [field]: e.target.value }))
    }
  }

  async function handleProfileSubmit(e) {
    e.preventDefault()
    setProfileError('')
    setProfileSaved(false)
    setSavingProfile(true)
    try {
      await api.put('/auth/profile', {
        email: form.email,
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
      setProfileSaved(true)
      // The sidebar and anything else reading `user.email` should reflect
      // a changed email immediately, not just after the next login.
      updateUser?.({ email: form.email })
    } catch (err) {
      setProfileError(err.message)
    } finally {
      setSavingProfile(false)
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault()
    setPasswordError('')
    setPasswordSaved(false)
    setSavingPassword(true)
    try {
      await api.post('/auth/change-password', {
        current_password: passwordForm.current,
        new_password: passwordForm.next,
        confirm_password: passwordForm.confirm,
      })
      setPasswordSaved(true)
      setPasswordForm({ current: '', next: '', confirm: '' })
    } catch (err) {
      setPasswordError(err.message)
    } finally {
      setSavingPassword(false)
    }
  }

  if (loading) {
    return <p className="text-gray-500 text-sm">Loading profile…</p>
  }

  return (
    <div className="max-w-lg space-y-8">
      {loadError && (
        <div className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-xl px-4 py-3">
          {loadError}
        </div>
      )}

      <section>
        <h2 className="text-lg font-bold mb-1">Profile</h2>
        <p className="text-gray-500 text-sm mb-5">
          {user?.role === 'host' ? 'Your host account details.' : 'Your account details.'}
        </p>

        <form onSubmit={handleProfileSubmit} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
          {profileError && (
            <div className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-xl px-4 py-3">
              {profileError}
            </div>
          )}
          {profileSaved && !profileError && (
            <div className="text-green-400 text-sm bg-green-950 border border-green-800 rounded-xl px-4 py-3">
              Profile updated.
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

          <Field label="Organization / company name">
            <input
              type="text"
              value={form.organizationName}
              onChange={update('organizationName')}
              className={inputClass}
            />
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
            disabled={savingProfile}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold transition-colors"
          >
            {savingProfile ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-1">Change password</h2>
        <p className="text-gray-500 text-sm mb-5">Update the password you use to sign in.</p>

        <form onSubmit={handlePasswordSubmit} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
          {passwordError && (
            <div className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-xl px-4 py-3">
              {passwordError}
            </div>
          )}
          {passwordSaved && !passwordError && (
            <div className="text-green-400 text-sm bg-green-950 border border-green-800 rounded-xl px-4 py-3">
              Password updated.
            </div>
          )}

          <Field label="Current password" required>
            <PasswordInput
              value={passwordForm.current}
              onChange={(e) => setPasswordForm((f) => ({ ...f, current: e.target.value }))}
              required
              className={inputClass}
            />
          </Field>

          <Field label="New password" required>
            <PasswordInput
              value={passwordForm.next}
              onChange={(e) => setPasswordForm((f) => ({ ...f, next: e.target.value }))}
              required
              minLength={8}
              className={inputClass}
            />
          </Field>

          <Field label="Confirm new password" required>
            <PasswordInput
              value={passwordForm.confirm}
              onChange={(e) => setPasswordForm((f) => ({ ...f, confirm: e.target.value }))}
              required
              minLength={8}
              className={inputClass}
            />
          </Field>

          <button
            type="submit"
            disabled={savingPassword}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold transition-colors"
          >
            {savingPassword ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </section>
    </div>
  )
}
