import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { date, inputClass } from './format'

const STATUS_STYLES = {
  pending: { label: 'Invited', cls: 'bg-purple-950 text-purple-300' },
  accepted: { label: 'Registered', cls: 'bg-green-950 text-green-400' },
  expired: { label: 'Expired', cls: 'bg-gray-800 text-gray-400' },
}

const registerLink = (token) => `${window.location.origin}/register?token=${encodeURIComponent(token)}`

// "Add Users" tab: invite someone by email. They register from the link and
// then appear on the Users tab waiting for approval.
export default function InvitePanel() {
  const [invites, setInvites] = useState(null)
  const [emailEnabled, setEmailEnabled] = useState(false)
  const [loadError, setLoadError] = useState('')

  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')

  // Raw tokens are only returned when an invite is created or resent, so
  // "Copy link" is available for those until the page is reloaded.
  const [tokens, setTokens] = useState({})
  const [copiedId, setCopiedId] = useState(null)
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    api
      .get('/superuser/invitations')
      .then((data) => {
        setInvites(data.invitations || [])
        setEmailEnabled(Boolean(data.email_enabled))
      })
      .catch((err) => setLoadError(err.message))
  }, [])

  function remember(data) {
    const inv = data.invitation
    setTokens((t) => ({ ...t, [inv.id]: inv.token }))
    setInvites((list) => [inv, ...(list || []).filter((i) => i.id !== inv.id && !(i.email.toLowerCase() === inv.email.toLowerCase() && i.status !== 'accepted'))])
    if (data.email_sent) setNotice(`Invitation emailed to ${inv.email}.`)
    else setNotice(data.email_error || `Invitation created for ${inv.email}. Email isn't set up, so copy the link and send it yourself.`)
  }

  async function handleInvite(e) {
    e.preventDefault()
    setFormError('')
    setNotice('')
    setSending(true)
    try {
      remember(await api.post('/superuser/invitations', { email }))
      setEmail('')
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSending(false)
    }
  }

  async function resend(inv) {
    setBusyId(inv.id)
    setFormError('')
    setNotice('')
    try {
      remember(await api.post(`/superuser/invitations/${inv.id}/resend`, {}))
    } catch (err) {
      setFormError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  async function revoke(inv) {
    if (!window.confirm(`Cancel the invitation for ${inv.email}? The link will stop working.`)) return
    setBusyId(inv.id)
    setFormError('')
    try {
      await api.del(`/superuser/invitations/${inv.id}`)
      setInvites((list) => list.filter((i) => i.id !== inv.id))
    } catch (err) {
      setFormError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  async function copy(inv) {
    try {
      await navigator.clipboard.writeText(registerLink(tokens[inv.id]))
      setCopiedId(inv.id)
      setTimeout(() => setCopiedId((id) => (id === inv.id ? null : id)), 2000)
    } catch {
      window.prompt('Copy this registration link:', registerLink(tokens[inv.id]))
    }
  }

  return (
    <div className="space-y-6">
      <section className="max-w-lg">
        <h2 className="text-lg font-bold mb-1">Invite a user</h2>
        <p className="text-gray-500 text-sm mb-4">
          They'll get a link to register as a host. Their account then waits for your approval on the Users tab.
          Links expire after 7 days.
        </p>
        <form onSubmit={handleInvite} className="flex flex-wrap gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="name@example.com"
            className={`${inputClass} flex-1 min-w-56`}
          />
          <button
            type="submit"
            disabled={sending}
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            {sending ? 'Sending…' : 'Send invite'}
          </button>
        </form>
        {!emailEnabled && invites && (
          <p className="text-xs text-yellow-500 mt-2">
            Email sending isn't configured (SMTP_HOST or RESEND_API_KEY), so use "Copy link" to share each invitation.
          </p>
        )}
      </section>

      {formError && (
        <div className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-xl px-4 py-3">{formError}</div>
      )}
      {notice && !formError && (
        <div className="text-green-400 text-sm bg-green-950 border border-green-800 rounded-xl px-4 py-3">{notice}</div>
      )}

      <section>
        <h2 className="text-lg font-bold mb-3">Invitations</h2>
        {loadError && <p className="text-red-400 text-sm">{loadError}</p>}
        {!invites && !loadError && <p className="text-gray-500 text-sm">Loading…</p>}
        {invites && invites.length === 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-sm text-gray-500 text-center">
            No invitations yet.
          </div>
        )}
        {invites && invites.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl divide-y divide-gray-800">
            {invites.map((inv) => {
              const style = STATUS_STYLES[inv.status] || STATUS_STYLES.pending
              const busy = busyId === inv.id
              const open = inv.status !== 'accepted'
              return (
                <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{inv.email}</p>
                    <p className="text-xs text-gray-500">
                      Invited {date(inv.created_at)}
                      {inv.status === 'pending' && ` · expires ${date(inv.expires_at)}`}
                      {inv.status === 'accepted' && ` · registered ${date(inv.accepted_at)}`}
                    </p>
                  </div>
                  <span className={`self-start sm:self-auto text-xs font-semibold px-2.5 py-1 rounded-full ${style.cls}`}>
                    {style.label}
                  </span>
                  {open && (
                    <div className="flex flex-wrap gap-2">
                      {tokens[inv.id] && inv.status === 'pending' && (
                        <button
                          onClick={() => copy(inv)}
                          className="text-sm px-3 py-1.5 rounded-lg border border-purple-800 text-purple-300 hover:bg-purple-950 transition-colors"
                        >
                          {copiedId === inv.id ? 'Copied!' : 'Copy link'}
                        </button>
                      )}
                      <button
                        onClick={() => resend(inv)}
                        disabled={busy}
                        className="text-sm px-3 py-1.5 rounded-lg border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
                      >
                        {inv.status === 'expired' ? 'Send new link' : 'Resend'}
                      </button>
                      <button
                        onClick={() => revoke(inv)}
                        disabled={busy}
                        className="text-sm px-3 py-1.5 rounded-lg border border-red-900 text-red-400 hover:bg-red-950 disabled:opacity-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
