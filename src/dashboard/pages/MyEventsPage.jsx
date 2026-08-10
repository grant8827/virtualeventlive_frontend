import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import { useDashboard } from '../DashboardContext'
import { startCheckout } from '../checkout'

export default function MyEventsPage() {
  const navigate = useNavigate()
  const { events, eventsLoading, currentEvents, fetchEvents } = useDashboard()

  const [showEventArchive, setShowEventArchive] = useState(false)
  const [archivedEvents, setArchivedEvents] = useState([])
  const [archiveLoading, setArchiveLoading] = useState(false)
  const [archiveError, setArchiveError] = useState('')
  const [eventToDelete, setEventToDelete] = useState(null)
  const [eventDeleting, setEventDeleting] = useState(false)
  const [eventDeleteError, setEventDeleteError] = useState('')

  async function openEventArchive() {
    setShowEventArchive(true)
    setArchiveLoading(true)
    setArchiveError('')
    try {
      const data = await api.get('/events?archive=true')
      setArchivedEvents(data.events || [])
    } catch (err) {
      setArchivedEvents([])
      setArchiveError(err.message || 'Unable to load event archive.')
    } finally {
      setArchiveLoading(false)
    }
  }

  async function handleCheckout(eventId) {
    try {
      const data = await api.post(`/events/${eventId}/checkout`, {})
      startCheckout(data, navigate)
    } catch (err) {
      alert(err.message)
    }
  }

  function requestEventDelete(event) {
    setEventDeleteError('')
    setEventToDelete(event)
  }

  async function confirmEventDelete() {
    if (!eventToDelete) return
    setEventDeleting(true)
    setEventDeleteError('')
    try {
      await api.del(`/events/${eventToDelete.id}`)
      await fetchEvents()
      setEventToDelete(null)
    } catch (err) {
      setEventDeleteError(err.message || 'Unable to delete event')
    } finally {
      setEventDeleting(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">My Events</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openEventArchive}
            className="text-sm border border-gray-700 bg-gray-900 hover:bg-gray-800 text-gray-300 px-4 py-2 rounded-xl transition-colors font-medium"
          >
            Archive
          </button>
          <button
            onClick={() => navigate('/dashboard/setup')}
            className="text-sm bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl transition-colors font-medium"
          >
            + Book New Event
          </button>
        </div>
      </div>

      {eventsLoading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : events.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-800 rounded-2xl">
          <p className="text-gray-500 mb-3">No events booked yet.</p>
          <button
            onClick={() => navigate('/dashboard/setup')}
            className="text-purple-400 hover:text-purple-300 text-sm transition-colors"
          >
            Book your first event →
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {currentEvents.length === 0 && (
            <div className="text-center py-12 border border-dashed border-gray-800 rounded-2xl">
              <p className="text-gray-500">No active events.</p>
            </div>
          )}

          {currentEvents.map((ev) => {
            const gross = ev.ticket_count * ev.ticket_price
            const platformFee = gross * 0.1
            const net = gross * 0.9 - (ev.venue_paid ? ev.venue_fee : 0)
            const starts = new Date(ev.starts_at)
            const ends = ev.ends_at ? new Date(ev.ends_at) : null
            const hours = ends ? Math.ceil((ends - starts) / 3600000) : null

            return (
              <div key={ev.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">

                {/* Event header */}
                <div className="px-6 py-4 border-b border-gray-800 flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-bold text-base">{ev.title}</h3>
                      <span className="text-xs capitalize bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
                        {ev.event_type || 'event'}
                      </span>
                      {ev.expired ? (
                        <span className="text-xs bg-gray-800 border border-gray-700 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                          ● Ended
                        </span>
                      ) : ev.venue_paid ? (
                        <span className="text-xs bg-green-950 border border-green-800 text-green-400 px-2 py-0.5 rounded-full font-medium">
                          ● Active
                        </span>
                      ) : (
                        <span className="text-xs bg-yellow-950 border border-yellow-800 text-yellow-500 px-2 py-0.5 rounded-full font-medium">
                          ● Unpaid
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                      <span>{starts.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      <span>·</span>
                      <span>{starts.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}{ends ? ` → ${ends.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}` : ''}</span>
                      {hours && <><span>·</span><span>{hours}h booked</span></>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {ev.expired ? (
                      <button
                        disabled
                        title="This event has ended"
                        className="text-sm bg-gray-800 text-gray-600 px-4 py-2 rounded-xl font-semibold cursor-not-allowed"
                      >
                        ● Go Live
                      </button>
                    ) : ev.venue_paid ? (
                      <button
                        onClick={() => navigate('/dashboard/golive')}
                        className="text-sm bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl transition-colors font-semibold"
                      >
                        ● Go Live
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCheckout(ev.id)}
                        className="text-sm bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl transition-colors font-medium"
                      >
                        Pay ${ev.venue_fee.toFixed(2)} to Activate
                      </button>
                    )}
                    <button
                      onClick={() => requestEventDelete(ev)}
                      className="text-sm border border-red-800 bg-red-950/50 hover:bg-red-900 text-red-400 hover:text-red-200 px-4 py-2 rounded-xl transition-colors font-semibold"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-gray-800">
                  {[
                    { label: 'Tickets Sold', value: ev.ticket_count.toString() },
                    { label: 'Gross Revenue', value: `$${gross.toFixed(2)}` },
                    { label: 'Platform Fee', value: `$${platformFee.toFixed(2)}` },
                    { label: 'Net Earnings', value: `$${Math.max(0, net).toFixed(2)}`, highlight: ev.venue_paid },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className={`px-5 py-4 ${stat.highlight ? 'bg-purple-950/40' : ''}`}
                    >
                      <p className={`text-xl font-bold mb-0.5 ${stat.highlight ? 'text-purple-300' : ''}`}>
                        {stat.value}
                      </p>
                      <p className="text-xs text-gray-500">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Venue fee row */}
                <div className="px-6 py-3 border-t border-gray-800 flex items-center justify-between text-xs text-gray-500">
                  <span>Venue fee: <span className="text-gray-400">${ev.venue_fee.toFixed(2)}</span>{ev.venue_paid ? <span className="text-green-500 ml-2">✓ paid</span> : <span className="text-yellow-600 ml-2">unpaid</span>}</span>
                  <span>Booked {new Date(ev.created_at).toLocaleDateString()}</span>
                </div>

              </div>
            )
          })}

        </div>
      )}

      {showEventArchive && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/85 px-4 py-8"
          onClick={(event) => { if (event.target === event.currentTarget) setShowEventArchive(false) }}
        >
          <div className="mx-auto w-full max-w-5xl rounded-2xl border border-gray-700 bg-gray-950 p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">Event Archive</h2>
                <p className="mt-1 text-sm text-gray-500">Past and removed events with their historical ticket and earnings totals.</p>
              </div>
              <button onClick={() => setShowEventArchive(false)} className="text-gray-500 hover:text-white">✕</button>
            </div>

            {archiveLoading ? (
              <p className="py-12 text-center text-sm text-gray-500">Loading archive…</p>
            ) : archiveError ? (
              <p className="py-12 text-center text-sm text-red-400">{archiveError}</p>
            ) : archivedEvents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-800 py-14 text-center text-gray-500">No past events yet.</div>
            ) : (
              <div className="space-y-5">
                {archivedEvents.map((ev) => {
                  const gross = ev.ticket_count * ev.ticket_price
                  const platformFee = gross * 0.1
                  const net = gross * 0.9 - (ev.venue_paid ? ev.venue_fee : 0)
                  const starts = new Date(ev.starts_at)
                  const ends = ev.ends_at ? new Date(ev.ends_at) : null
                  return (
                    <div key={ev.id} className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 opacity-85">
                      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-800 px-6 py-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold">{ev.title}</h3>
                            <span className="rounded-full border border-gray-700 bg-gray-800 px-2 py-0.5 text-xs text-gray-500">Archived</span>
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            {starts.toLocaleString()}{ends ? ` → ${ends.toLocaleString()}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 divide-x divide-y divide-gray-800 md:grid-cols-4 md:divide-y-0">
                        {[
                          { label: 'Tickets Sold', value: ev.ticket_count.toString() },
                          { label: 'Gross Revenue', value: `$${gross.toFixed(2)}` },
                          { label: 'Platform Fee', value: `$${platformFee.toFixed(2)}` },
                          { label: 'Net Earnings', value: `$${Math.max(0, net).toFixed(2)}` },
                        ].map((stat) => (
                          <div key={stat.label} className="px-5 py-4">
                            <p className="text-xl font-bold text-gray-300">{stat.value}</p>
                            <p className="text-xs text-gray-600">{stat.label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {eventToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4"
          onClick={(event) => {
            if (event.target === event.currentTarget && !eventDeleting) setEventToDelete(null)
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-red-900 bg-gray-900 p-6 shadow-2xl">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-950 text-2xl">⚠️</div>
            <h2 className="text-center text-xl font-bold text-white">Remove this event?</h2>
            <p className="mt-2 text-center text-sm text-gray-400">
              Do you want to remove <span className="font-semibold text-white">{eventToDelete.title}</span> from My Events and public listings?
            </p>
            <div className="mt-5 rounded-xl border border-red-900/70 bg-red-950/30 p-4 text-sm text-red-200">
              <p className="font-semibold">The event will be closed:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-red-300/90">
                <li>Issued tickets and financial records will be preserved.</li>
                <li>Access codes will no longer grant event entry.</li>
                <li>The event flyer will be removed from public listings.</li>
                <li>Venue fees and ticket payments are not automatically refunded.</li>
              </ul>
            </div>
            {eventDeleteError && <p className="mt-4 text-sm text-red-400">{eventDeleteError}</p>}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                disabled={eventDeleting}
                onClick={() => setEventToDelete(null)}
                className="flex-1 rounded-xl border border-gray-700 bg-gray-800 py-3 font-semibold text-gray-300 hover:bg-gray-700 disabled:opacity-50"
              >
                Keep Event
              </button>
              <button
                type="button"
                disabled={eventDeleting}
                onClick={confirmEventDelete}
                className="flex-1 rounded-xl bg-red-600 py-3 font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {eventDeleting ? 'Removing…' : 'Remove Event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
