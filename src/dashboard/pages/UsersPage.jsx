import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { useAuth } from '../../contexts/AuthContext'
import PasswordInput from '../../components/PasswordInput'

// Add User — the host (or an admin) adds staff/admin logins to this account.
// Staff see Go Live, Chat, Tickets/Flyer and Scan Tickets; admins see
// everything. The backend enforces the same split.

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

const ROLE_OPTIONS = [
  { value: 'staff', label: 'Staff', hint: 'Go Live, Chat, Tickets/Flyer and Scan Tickets' },
  { value: 'admin', label: 'Admin', hint: 'Everything on the dashboard, including Add User' },
]

const EMPTY_FORM = { fullName: '', streamName: '', email: '', password: '', role: 'staff' }

export default function UsersPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState('add')

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [busyId, setBusyId] = useState(null)

  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [added, setAdded] = useState('')

  // Inline Edit panel on the Users tab — one member at a time.
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(EMPTY_FORM)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  useEffect(() => {
    api
      .get('/team')
      .then((data) => setUsers(data.users || []))
      .catch((err) => setListError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  async function handleAdd(e) {
    e.preventDefault()
    setFormError('')
    setAdded('')
    setSaving(true)
    try {
      const created = await api.post('/team', {
        full_name: form.fullName,
        stream_name: form.streamName,
        email: form.email,
        password: form.password,
        role: form.role,
      })
      setUsers((list) => [...list, created])
      setAdded(`${created.full_name || created.email} was added as ${created.role}.`)
      setForm(EMPTY_FORM)
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function patchUser(member, patch) {
    setBusyId(member.id)
    setListError('')
    try {
      const updated = await api.patch(`/team/${member.id}`, patch)
      setUsers((list) => list.map((u) => (u.id === updated.id ? updated : u)))
    } catch (err) {
      setListError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  function startEdit(member) {
    setEditingId(member.id)
    setEditError('')
    setEditForm({
      fullName: member.full_name || '',
      streamName: member.stream_name || '',
      email: member.email,
      password: '',
      role: member.role,
    })
  }

  const updateEdit = (key) => (e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))

  async function handleEditSave(e) {
    e.preventDefault()
    setEditError('')
    setEditSaving(true)
    try {
      const updated = await api.patch(`/team/${editingId}`, {
        full_name: editForm.fullName,
        stream_name: editForm.streamName,
        email: editForm.email,
        role: editForm.role,
        // Blank keeps the current password.
        ...(editForm.password ? { password: editForm.password } : {}),
      })
      setUsers((list) => list.map((u) => (u.id === updated.id ? updated : u)))
      setEditingId(null)
    } catch (err) {
      setEditError(err.message)
    } finally {
      setEditSaving(false)
    }
  }

  async function deleteUser(member) {
    if (!window.confirm(`Delete ${member.full_name || member.email}? They will no longer be able to sign in.`)) return
    setBusyId(member.id)
    setListError('')
    try {
      await api.del(`/team/${member.id}`)
      setUsers((list) => list.filter((u) => u.id !== member.id))
    } catch (err) {
      setListError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Sub-tab bar */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 mb-7">
        {[
          { id: 'add', label: 'Add User' },
          { id: 'users', label: `Users${users.length ? ` (${users.length})` : ''}` },
        ].map((st) => (
          <button
            key={st.id}
            onClick={() => setTab(st.id)}
            className={`flex-1 text-sm font-medium py-2 px-4 rounded-lg transition-colors ${
              tab === st.id ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {st.label}
          </button>
        ))}
      </div>

      {/* ── Add User tab ── */}
      {tab === 'add' && (
        <section className="max-w-lg">
          <h2 className="text-lg font-bold mb-1">Add a user</h2>
          <p className="text-gray-500 text-sm mb-5">
            Give someone their own login to help run this account. Share the email and password with them.
          </p>

          <form onSubmit={handleAdd} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
            {formError && (
              <div className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-xl px-4 py-3">
                {formError}
              </div>
            )}
            {added && !formError && (
              <div className="text-green-400 text-sm bg-green-950 border border-green-800 rounded-xl px-4 py-3">
                {added}
              </div>
            )}

            <Field label="Full name" required>
              <input type="text" value={form.fullName} onChange={update('fullName')} required className={inputClass} />
            </Field>

            <Field label="Stream name (optional)">
              <input
                type="text"
                value={form.streamName}
                onChange={update('streamName')}
                placeholder="The name they go live under"
                className={inputClass}
              />
            </Field>

            <Field label="Email address" required>
              <input type="email" value={form.email} onChange={update('email')} required className={inputClass} />
            </Field>

            <Field label="Password" required>
              <PasswordInput
                value={form.password}
                onChange={update('password')}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                className={inputClass}
              />
            </Field>

            <Field label="Role" required>
              <div className="grid grid-cols-2 gap-3">
                {ROLE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`cursor-pointer rounded-xl border px-4 py-3 transition-colors ${
                      form.role === opt.value
                        ? 'border-purple-500 bg-purple-600/10'
                        : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={opt.value}
                      checked={form.role === opt.value}
                      onChange={update('role')}
                      className="sr-only"
                    />
                    <span className="block text-sm font-semibold text-white">{opt.label}</span>
                    <span className="block text-xs text-gray-400 mt-0.5">{opt.hint}</span>
                  </label>
                ))}
              </div>
            </Field>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold transition-colors"
            >
              {saving ? 'Adding…' : 'Add user'}
            </button>
          </form>
        </section>
      )}

      {/* ── Users tab ── */}
      {tab === 'users' && (
        <section>
          <h2 className="text-lg font-bold mb-1">Users</h2>
          <p className="text-gray-500 text-sm mb-5">Everyone added to this account.</p>

          {listError && (
            <div className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-xl px-4 py-3 mb-4">
              {listError}
            </div>
          )}

          {loading ? (
            <p className="text-gray-500 text-sm">Loading…</p>
          ) : users.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
              <p className="text-gray-400 text-sm">No users added yet.</p>
              <button onClick={() => setTab('add')} className="mt-3 text-sm text-purple-400 hover:text-purple-300">
                Add a user
              </button>
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl divide-y divide-gray-800">
              {users.map((member) => {
                const isSelf = member.id === user?.id
                const busy = busyId === member.id
                const suspended = member.status === 'suspended'
                const editing = editingId === member.id
                return (
                  <div key={member.id}>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {member.full_name || member.email}
                          {isSelf && <span className="text-gray-500 font-normal"> (you)</span>}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {member.email}
                          {member.stream_name && <span> · Stream: {member.stream_name}</span>}
                        </p>
                      </div>

                      <span
                        className={`self-start sm:self-auto text-xs font-semibold px-2.5 py-1 rounded-full ${
                          suspended ? 'bg-red-950 text-red-400' : 'bg-green-950 text-green-400'
                        }`}
                      >
                        {suspended ? 'Suspended' : 'Active'}
                      </span>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => (editing ? setEditingId(null) : startEdit(member))}
                          disabled={busy || isSelf}
                          className={`text-sm px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            editing
                              ? 'border-purple-500 bg-purple-600/10 text-white'
                              : 'border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800'
                          }`}
                        >
                          Edit
                        </button>
                        <select
                          value={member.role}
                          disabled={busy || isSelf}
                          onChange={(e) => patchUser(member, { role: e.target.value })}
                          aria-label={`Role for ${member.email}`}
                          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-purple-500 disabled:opacity-50"
                        >
                          {ROLE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => patchUser(member, { status: suspended ? 'active' : 'suspended' })}
                          disabled={busy || isSelf}
                          className="text-sm px-3 py-1.5 rounded-lg border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {suspended ? 'Reactivate' : 'Suspend'}
                        </button>
                        <button
                          onClick={() => deleteUser(member)}
                          disabled={busy || isSelf}
                          className="text-sm px-3 py-1.5 rounded-lg border border-red-900 text-red-400 hover:bg-red-950 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {editing && (
                      <form onSubmit={handleEditSave} className="px-4 pb-5 space-y-4">
                        {editError && (
                          <div className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-xl px-4 py-3">
                            {editError}
                          </div>
                        )}
                        <div className="grid sm:grid-cols-2 gap-4">
                          <Field label="Full name" required>
                            <input type="text" value={editForm.fullName} onChange={updateEdit('fullName')} required className={inputClass} />
                          </Field>
                          <Field label="Stream name (optional)">
                            <input type="text" value={editForm.streamName} onChange={updateEdit('streamName')} className={inputClass} />
                          </Field>
                          <Field label="Email address" required>
                            <input type="email" value={editForm.email} onChange={updateEdit('email')} required className={inputClass} />
                          </Field>
                          <Field label="Role" required>
                            <select value={editForm.role} onChange={updateEdit('role')} className={inputClass}>
                              {ROLE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </Field>
                        </div>
                        <Field label="New password">
                          <PasswordInput
                            value={editForm.password}
                            onChange={updateEdit('password')}
                            minLength={8}
                            autoComplete="new-password"
                            placeholder="Leave blank to keep their current password"
                            className={inputClass}
                          />
                        </Field>
                        <div className="flex gap-3">
                          <button
                            type="submit"
                            disabled={editSaving}
                            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors"
                          >
                            {editSaving ? 'Saving…' : 'Save changes'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="px-5 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
