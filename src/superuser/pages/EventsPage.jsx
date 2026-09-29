import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { count, date, inputClass, money } from '../format'
import Pager from '../Pager'
import useDebounced from '../useDebounced'

function EventStatus({ ev }) {
  let label = 'Upcoming'
  let cls = 'bg-green-950 text-green-400'
  if (ev.cancelled) {
    label = 'Cancelled'
    cls = 'bg-red-950 text-red-400'
  } else if (ev.live) {
    label = '● Live'
    cls = 'bg-red-950 text-red-300'
  } else if (ev.expired) {
    label = 'Ended'
    cls = 'bg-gray-800 text-gray-400'
  } else if (!ev.venue_paid) {
    label = 'Pending payment'
    cls = 'bg-yellow-950 text-yellow-500'
  } else if (!ev.is_active) {
    label = 'Disabled'
    cls = 'bg-red-950 text-red-400'
  }
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${cls}`}>{label}</span>
}

export default function EventsPage() {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const search = useDebounced(q, 300)

  const query = new URLSearchParams({ q: search, status, page: String(page) }).toString()
  const [result, setResult] = useState({ query: null, events: [], total: 0 })
  const [error, setError] = useState('')
  const loading = result.query !== query

  const [busyId, setBusyId] = useState(null)
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    let cancelled = false
    api
      .get(`/superuser/events?${query}`)
      .then((data) => {
        if (cancelled) return
        setResult({ query, events: data.events || [], total: data.total || 0 })
        setError('')
      })
      .catch((err) => {
        if (cancelled) return
        setResult({ query, events: [], total: 0 })
        setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [query])

  async function act(ev, request) {
    setBusyId(ev.id)
    setActionError('')
    try {
      const updated = await request()
      // Keep the live flag from the list; the single-event response doesn't poll IVS.
      setResult((r) => ({
        ...r,
        events: r.events.map((e) => (e.id === updated.id ? { ...updated, live: e.live, viewers: e.viewers } : e)),
      }))
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  // Actions dropdown: approve (activate without the venue-fee payment),
  // disable / enable, and cancel.
  function choose(ev, action) {
    if (action === 'approve') {
      if (!window.confirm(`Approve "${ev.title}" without payment? It goes live for ticket sales and won't count as venue-fee revenue.`)) return
      act(ev, () => api.post(`/superuser/events/${ev.id}/activate`, {}))
    }
    if (action === 'disable') {
      if (!window.confirm(`Disable "${ev.title}"? It will be hidden from the public and stop selling tickets until you enable it again.`)) return
      act(ev, () => api.patch(`/superuser/events/${ev.id}`, { is_active: false }))
    }
    if (action === 'enable') {
      act(ev, () => api.patch(`/superuser/events/${ev.id}`, { is_active: true }))
    }
    if (action === 'cancel') {
      const sold = ev.tickets > 0 ? ` ${ev.tickets} ticket(s) have been sold; refunds are not issued automatically.` : ''
      if (!window.confirm(`Cancel "${ev.title}"? This ends the event for good and removes its flyers.${sold}`)) return
      act(ev, () => api.post(`/superuser/events/${ev.id}/cancel`, {}))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setPage(1)
          }}
          placeholder="Search event title or host"
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
          <option value="">All events</option>
          <option value="upcoming">Upcoming</option>
          <option value="unpaid">Pending payment</option>
          <option value="disabled">Disabled</option>
          <option value="ended">Ended</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {(error || actionError) && (
        <div className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-xl px-4 py-3">{error || actionError}</div>
      )}

      <div className={`bg-gray-900 border border-gray-800 rounded-2xl overflow-x-auto ${loading ? 'opacity-60' : ''}`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 text-left">
              <th className="px-4 py-2.5 font-medium">Event</th>
              <th className="px-4 py-2.5 font-medium">Host</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium text-right">Tickets</th>
              <th className="px-4 py-2.5 font-medium text-right">Sales</th>
              <th className="px-4 py-2.5 font-medium text-right">Venue fee</th>
              <th className="px-4 py-2.5 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && result.events.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-gray-500">No events match.</td>
              </tr>
            )}
            {result.events.map((ev) => {
              const busy = busyId === ev.id
              return (
                <tr key={ev.id} className="border-t border-gray-800 align-top">
                  <td className="px-4 py-3">
                    <p className="font-medium">{ev.title}</p>
                    <p className="text-xs text-gray-500 capitalize">
                      {ev.event_type} · {date(ev.starts_at)}
                      {ev.live && ` · 👁 ${count(ev.viewers)} watching`}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="truncate max-w-44">{ev.host_name || ev.host_email}</p>
                    {ev.host_name && <p className="text-xs text-gray-500 truncate max-w-44">{ev.host_email}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <EventStatus ev={ev} />
                  </td>
                  <td className="px-4 py-3 text-right text-gray-300">{count(ev.tickets)}</td>
                  <td className="px-4 py-3 text-right">
                    <p className="font-semibold">{money(ev.gross)}</p>
                    <p className="text-xs text-gray-500">{money(ev.platform_fee)} fee</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="text-gray-300">{money(ev.venue_fee)}</p>
                    <p className="text-xs text-gray-500">
                      {!ev.venue_paid ? 'Not paid' : ev.venue_bypassed ? 'Waived' : 'Paid'}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {ev.expired || ev.cancelled ? (
                      <span className="text-xs text-gray-600">—</span>
                    ) : (
                      <select
                        value=""
                        onChange={(e) => choose(ev, e.target.value)}
                        disabled={busy}
                        aria-label={`Actions for ${ev.title}`}
                        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-purple-500 disabled:opacity-50"
                      >
                        <option value="" disabled>
                          {busy ? 'Working…' : 'Actions'}
                        </option>
                        <option value="approve" disabled={ev.venue_paid}>
                          Approve
                        </option>
                        {ev.venue_paid && !ev.is_active ? (
                          <option value="enable">Enable</option>
                        ) : (
                          <option value="disable" disabled={!ev.venue_paid}>
                            Disable
                          </option>
                        )}
                        <option value="cancel">Cancel event</option>
                      </select>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Pager page={page} total={result.total} onPage={setPage} noun="events" />
    </div>
  )
}
