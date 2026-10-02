import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { inputClass } from '../format'

// Read-only view of the security audit log: sign-ins, failures, lockouts,
// password/email changes, role/status changes, invitations and superuser
// actions. Details never include passwords, tokens or plain email addresses.
const TYPES = [
  'login_success', 'login_failed', 'login_locked', 'logout', 'logout_everywhere',
  'password_changed', 'password_reset_requested', 'password_reset_completed',
  'email_change_requested', 'email_verified',
  'team_member_created', 'team_member_updated', 'team_member_deleted',
  'superuser_user_updated', 'superuser_user_rejected',
  'superuser_event_approved', 'superuser_event_updated', 'superuser_event_cancelled',
  'invitation_issued', 'invitation_revoked',
  'superuser_refund_issued', 'superuser_reconciliation_run',
]

const ALERT = new Set(['login_failed', 'login_locked', 'superuser_user_updated', 'superuser_event_cancelled', 'superuser_refund_issued'])

export default function SecurityLogPage() {
  const [type, setType] = useState('')
  const [result, setResult] = useState({ type: null, events: [], error: '' })
  const loading = result.type !== type

  useEffect(() => {
    let cancelled = false
    api
      .get(`/superuser/security-events?limit=200${type ? `&type=${encodeURIComponent(type)}` : ''}`)
      .then((d) => { if (!cancelled) setResult({ type, events: d.events || [], error: '' }) })
      .catch((err) => { if (!cancelled) setResult({ type, events: [], error: err.message }) })
    return () => { cancelled = true }
  }, [type])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Security log</h2>
          <p className="text-gray-500 text-sm">The latest 200 security events.</p>
        </div>
        <select value={type} onChange={(e) => setType(e.target.value)} className={inputClass} aria-label="Filter by event type">
          <option value="">All events</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>{t.replaceAll('_', ' ')}</option>
          ))}
        </select>
      </div>

      {result.error && (
        <div className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-xl px-4 py-3">{result.error}</div>
      )}

      <div className={`bg-gray-900 border border-gray-800 rounded-2xl overflow-x-auto ${loading ? 'opacity-60' : ''}`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 text-left">
              <th className="px-4 py-2.5 font-medium">When</th>
              <th className="px-4 py-2.5 font-medium">Event</th>
              <th className="px-4 py-2.5 font-medium">By</th>
              <th className="px-4 py-2.5 font-medium">Account</th>
              <th className="px-4 py-2.5 font-medium">IP</th>
              <th className="px-4 py-2.5 font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {!loading && result.events.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-gray-500">No events.</td></tr>
            )}
            {result.events.map((e) => (
              <tr key={e.id} className="border-t border-gray-800 align-top">
                <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">{new Date(e.occurred_at).toLocaleString()}</td>
                <td className={`px-4 py-2.5 font-medium whitespace-nowrap ${ALERT.has(e.event_type) ? 'text-yellow-500' : ''}`}>
                  {e.event_type.replaceAll('_', ' ')}
                </td>
                <td className="px-4 py-2.5 text-gray-300">{e.actor_email || '—'}</td>
                <td className="px-4 py-2.5 text-gray-300">{e.target_email || '—'}</td>
                <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">{e.ip || '—'}</td>
                <td className="px-4 py-2.5 text-gray-500 font-mono text-xs max-w-64 break-words">
                  {e.details && Object.keys(e.details).length ? JSON.stringify(e.details) : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
