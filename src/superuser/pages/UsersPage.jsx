import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { count, date, inputClass, money } from '../format'
import InvitePanel from '../InvitePanel'
import Pager from '../Pager'
import useDebounced from '../useDebounced'

const STATUS_BADGES = {
  pending: { label: 'Awaiting approval', cls: 'bg-yellow-950 text-yellow-500' },
  active: { label: 'Active', cls: 'bg-green-950 text-green-400' },
  suspended: { label: 'Suspended', cls: 'bg-red-950 text-red-400' },
}

// Two tabs: "Users" lists people who registered themselves (not the staff
// and admins hosts add to their teams); "Add Users" sends invitations.
export default function UsersPage() {
  const [tab, setTab] = useState('users')
  return (
    <div>
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 mb-6 max-w-md">
        {[
          { id: 'users', label: 'Users' },
          { id: 'add', label: 'Add Users' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 text-sm font-medium py-2 px-4 rounded-lg transition-colors ${
              tab === t.id ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'users' ? <RegisteredUsers /> : <InvitePanel />}
    </div>
  )
}

// Loads one page of /superuser/users for the given filters. `version`
// forces a reload after an action moves someone between lists.
function useUserList(params, version) {
  const query = new URLSearchParams(params).toString()
  const key = `${query}#${version}`
  const [result, setResult] = useState({ key: null, users: [], total: 0 })
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    api
      .get(`/superuser/users?${query}`)
      .then((data) => {
        if (cancelled) return
        setResult({ key, users: data.users || [], total: data.total || 0 })
        setError('')
      })
      .catch((err) => {
        if (cancelled) return
        setResult({ key, users: [], total: 0 })
        setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [query, key])

  return { ...result, error, loading: result.key !== key, setResult }
}

function RegisteredUsers() {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('approved')
  const [page, setPage] = useState(1)
  const [version, setVersion] = useState(0)
  const search = useDebounced(q, 300)

  // New registrations wait here until they're activated.
  const pending = useUserList({ status: 'pending' }, version)
  const approved = useUserList({ q: search, status, page: String(page) }, version)

  const [busyId, setBusyId] = useState(null)
  const [actionError, setActionError] = useState('')
  const [notice, setNotice] = useState('')

  async function run(member, request, successMessage) {
    setBusyId(member.id)
    setActionError('')
    setNotice('')
    try {
      await request()
      setNotice(successMessage)
      setVersion((v) => v + 1)
      return true
    } catch (err) {
      setActionError(err.message)
      return false
    } finally {
      setBusyId(null)
    }
  }

  const actions = {
    activate: (u) =>
      run(
        u,
        () => api.patch(`/superuser/users/${u.id}`, { status: 'active' }),
        u.status === 'pending' ? `${u.email} is approved and can now sign in.` : `${u.email} is active again.`,
      ),
    suspend: (u) => {
      const extra = u.role === 'host' ? ' Anyone on their team will be locked out too.' : ''
      if (!window.confirm(`Suspend ${u.email}?${extra}`)) return
      run(u, () => api.patch(`/superuser/users/${u.id}`, { status: 'suspended' }), `${u.email} is suspended.`)
    },
    reject: (u) => {
      if (!window.confirm(`Reject ${u.email}? Their registration will be deleted.`)) return
      run(u, () => api.del(`/superuser/users/${u.id}`), `${u.email}'s registration was rejected.`)
    },
    resetPassword: (u, password) =>
      run(u, () => api.patch(`/superuser/users/${u.id}`, { password }), `New password set for ${u.email}.`),
  }

  const error = pending.error || approved.error || actionError

  return (
    <div className="space-y-8">
      {error && <div className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-xl px-4 py-3">{error}</div>}
      {notice && !error && (
        <div className="text-green-400 text-sm bg-green-950 border border-green-800 rounded-xl px-4 py-3">{notice}</div>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-bold">
          Pending approval
          {pending.total > 0 && <span className="ml-2 text-sm font-semibold text-yellow-500">{count(pending.total)}</span>}
        </h2>
        <div className={`bg-gray-900 border border-gray-800 rounded-2xl divide-y divide-gray-800 ${pending.loading ? 'opacity-60' : ''}`}>
          {!pending.loading && pending.users.length === 0 && (
            <p className="p-6 text-sm text-gray-500 text-center">No one is waiting for approval.</p>
          )}
          {pending.users.map((u) => (
            <UserRow key={u.id} user={u} busy={busyId === u.id} actions={actions} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Users</h2>
        <div className="flex flex-wrap gap-2">
          <input
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setPage(1)
            }}
            placeholder="Search name, email or organization"
            className={`${inputClass} flex-1 min-w-56`}
          />
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
            className={inputClass}
            aria-label="Filter by status"
          >
            <option value="approved">Any status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
        <div className={`bg-gray-900 border border-gray-800 rounded-2xl divide-y divide-gray-800 ${approved.loading ? 'opacity-60' : ''}`}>
          {!approved.loading && approved.users.length === 0 && (
            <p className="p-6 text-sm text-gray-500 text-center">No users match.</p>
          )}
          {approved.users.map((u) => (
            <UserRow key={u.id} user={u} busy={busyId === u.id} actions={actions} />
          ))}
        </div>
        <Pager page={page} total={approved.total} onPage={setPage} noun="users" />
      </section>
    </div>
  )
}

function UserRow({ user: u, busy, actions }) {
  const [resetting, setResetting] = useState(false)
  const [password, setPassword] = useState('')
  const badge = STATUS_BADGES[u.status] || STATUS_BADGES.active
  const pending = u.status === 'pending'

  function choose(e) {
    const action = e.target.value
    e.target.value = ''
    if (action === 'activate') actions.activate(u)
    if (action === 'suspend') actions.suspend(u)
    if (action === 'reject') actions.reject(u)
    if (action === 'reset') setResetting(true)
  }

  async function submitReset(e) {
    e.preventDefault()
    if (await actions.resetPassword(u, password)) {
      setResetting(false)
      setPassword('')
    }
  }

  return (
    <div className="p-4">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{u.full_name || u.email}</p>
          <p className="text-sm text-gray-500 truncate">
            {u.email}
            {u.organization_name && ` · ${u.organization_name}`}
          </p>
          <p className="text-xs text-gray-600 mt-0.5">
            {pending ? 'Registered' : 'Joined'} {date(u.created_at)}
            {u.role === 'host' && !pending && ` · ${count(u.events)} events · ${count(u.tickets)} tickets · ${money(u.gross)} sales`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badge.cls}`}>{badge.label}</span>
          <select
            defaultValue=""
            onChange={choose}
            disabled={busy}
            aria-label={`Actions for ${u.email}`}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-purple-500 disabled:opacity-50"
          >
            <option value="" disabled>
              {busy ? 'Working…' : 'Actions'}
            </option>
            <option value="activate" disabled={u.status === 'active'}>
              {pending ? 'Activate (approve)' : 'Activate'}
            </option>
            <option value="suspend" disabled={u.status === 'suspended'}>
              Suspend
            </option>
            <option value="reset">Reset password</option>
            {pending && <option value="reject">Reject registration</option>}
          </select>
        </div>
      </div>

      {resetting && (
        <form onSubmit={submitReset} className="mt-3 flex flex-wrap gap-2">
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
            autoFocus
            autoComplete="new-password"
            placeholder="New password (min 8 characters)"
            className={`${inputClass} flex-1 min-w-56`}
          />
          <button
            type="submit"
            disabled={busy}
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            Set password
          </button>
          <button
            type="button"
            onClick={() => setResetting(false)}
            className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
        </form>
      )}
    </div>
  )
}
