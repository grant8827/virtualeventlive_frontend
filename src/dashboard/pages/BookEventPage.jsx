import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import { useDashboard } from '../DashboardContext'
import { startCheckout } from '../checkout'

export default function BookEventPage() {
  const navigate = useNavigate()
  const { fetchEvents } = useDashboard()

  const [form, setForm] = useState({
    title: '',
    event_type: 'concert',
    description: '',
    date: '',
    start_time: '',
    end_time: '',
  })
  const [formError, setFormError] = useState('')
  const [venueFeePreview, setVenueFeePreview] = useState(null)
  // Two-step setup flow: 'form' → 'pay'. The event is not saved to the
  // backend until payment is initiated — pendingEvent only lives in
  // local state while the host reviews the summary.
  const [setupStep, setSetupStep] = useState('form')
  const [pendingEvent, setPendingEvent] = useState(null)
  const [payLoading, setPayLoading] = useState(false)
  const [payError, setPayError] = useState('')
  const [bypassLoading, setBypassLoading] = useState(false)
  const [bypassError, setBypassError] = useState('')

  // Combine date + start_time/end_time into ISO instants. If end_time is
  // earlier than start_time, treat it as crossing midnight into the next day.
  function computeRange(f) {
    if (!f.date || !f.start_time || !f.end_time) return null
    const starts_at = new Date(`${f.date}T${f.start_time}:00`)
    let ends_at = new Date(`${f.date}T${f.end_time}:00`)
    if (ends_at <= starts_at) ends_at = new Date(ends_at.getTime() + 24 * 3600000)
    return { starts_at, ends_at }
  }

  function updateForm(key, val) {
    const next = { ...form, [key]: val }
    setForm(next)
    const range = computeRange(next)
    if (range) {
      const diff = range.ends_at - range.starts_at
      if (diff >= 3600000) {
        const hours = Math.ceil(diff / 3600000)
        setVenueFeePreview({ hours, fee: hours * 20 })
      } else {
        setVenueFeePreview(null)
      }
    } else {
      setVenueFeePreview(null)
    }
  }

  // Step 1 just validates and stages the event locally — nothing is
  // persisted until the host actually pays in step 2.
  function handleCreateEvent(e) {
    e.preventDefault()
    setFormError('')
    const range = computeRange(form)
    if (!range) {
      setFormError('Please set a date, start time, and end time.')
      return
    }
    const diff = range.ends_at - range.starts_at
    if (diff < 3600000) {
      setFormError('Minimum booking is 1 hour.')
      return
    }
    const hours = Math.ceil(diff / 3600000)
    setPendingEvent({
      title: form.title,
      event_type: form.event_type,
      description: form.description,
      starts_at: range.starts_at.toISOString(),
      ends_at: range.ends_at.toISOString(),
      hours,
      venue_fee: hours * 20,
    })
    setSetupStep('pay')
  }

  // Only now is the event actually created on the backend, immediately
  // followed by kicking off checkout for the venue fee.
  async function handlePayNow() {
    if (!pendingEvent) return
    setPayError('')
    setPayLoading(true)
    try {
      const created = await api.post('/events', {
        title: pendingEvent.title,
        event_type: pendingEvent.event_type,
        description: pendingEvent.description,
        starts_at: pendingEvent.starts_at,
        ends_at: pendingEvent.ends_at,
      })
      const data = await api.post(`/events/${created.id}/checkout`, {})
      startCheckout(data, navigate)
      fetchEvents() // refresh in background
    } catch (err) {
      setPayError(err.message)
    } finally {
      setPayLoading(false)
    }
  }

  async function handleBypassActivate() {
    if (!pendingEvent) {
      setBypassError('No pending event — go back and fill the form.')
      return
    }
    setBypassError('')
    setBypassLoading(true)
    try {
      const created = await api.post('/events', {
        title: pendingEvent.title,
        event_type: pendingEvent.event_type,
        description: pendingEvent.description,
        starts_at: pendingEvent.starts_at,
        ends_at: pendingEvent.ends_at,
      })
      await api.post(`/events/${created.id}/bypass-activate`, {})
      await fetchEvents()
      setPendingEvent(null)
      setSetupStep('form')
      navigate('/dashboard/events')
    } catch (err) {
      setBypassError(err.message || 'Something went wrong')
    } finally {
      setBypassLoading(false)
    }
  }

  function handleStartOver() {
    setSetupStep('form')
    setPendingEvent(null)
    setPayError('')
    setBypassError('')
    setForm({ title: '', event_type: 'concert', description: '', date: '', start_time: '', end_time: '' })
    setVenueFeePreview(null)
  }

  return (
    <div className="max-w-xl mx-auto">

      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-7">
        <div className={`flex items-center gap-2 text-sm font-semibold ${setupStep === 'form' ? 'text-purple-400' : 'text-gray-600'}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${setupStep === 'form' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
            1
          </span>
          Event Details
        </div>
        <div className={`flex-1 h-px ${setupStep === 'pay' ? 'bg-purple-600' : 'bg-gray-800'}`} />
        <div className={`flex items-center gap-2 text-sm font-semibold ${setupStep === 'pay' ? 'text-purple-400' : 'text-gray-600'}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${setupStep === 'pay' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
            2
          </span>
          Activate &amp; Pay
        </div>
      </div>

      {/* ── Step 1: Event form ── */}
      {setupStep === 'form' && (
        <form onSubmit={handleCreateEvent} className="space-y-5">
          {formError && (
            <div className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-xl px-4 py-3">
              {formError}
            </div>
          )}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Event Name</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => updateForm('title', e.target.value)}
              required
              placeholder="My Virtual Event"
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Event Type</label>
            <select
              value={form.event_type}
              onChange={(e) => updateForm('event_type', e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 transition-colors"
            >
              <option value="concert">Concert</option>
              <option value="conference">Conference</option>
              <option value="workshop">Workshop</option>
              <option value="webinar">Webinar</option>
              <option value="comedy">Comedy</option>
              <option value="sports">Sports</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => updateForm('date', e.target.value)}
              required
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Start Time</label>
              <input
                type="time"
                value={form.start_time}
                onChange={(e) => updateForm('start_time', e.target.value)}
                required
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">End Time</label>
              <input
                type="time"
                value={form.end_time}
                onChange={(e) => updateForm('end_time', e.target.value)}
                required
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Description (optional)</label>
            <textarea
              value={form.description}
              onChange={(e) => updateForm('description', e.target.value)}
              rows={3}
              placeholder="What's this event about?"
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors resize-none"
            />
          </div>
          {venueFeePreview && (
            <div className="bg-purple-950 border border-purple-800 rounded-xl px-4 py-3">
              <p className="text-sm text-purple-200">
                Venue fee:{' '}
                <strong className="text-white">${venueFeePreview.fee.toFixed(2)}</strong>
                <span className="text-purple-400 ml-2 text-xs">
                  ({venueFeePreview.hours}h × $20/hr)
                </span>
              </p>
              <p className="text-xs text-purple-500 mt-0.5">
                Pay once to activate your event. 10% platform commission per ticket sale.
              </p>
            </div>
          )}
          <button
            type="submit"
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-semibold transition-colors"
          >
            Review &amp; Pay →
          </button>
        </form>
      )}

      {/* ── Step 2: Pay Now ── */}
      {setupStep === 'pay' && pendingEvent && (
        <div className="space-y-5">
          {/* Review banner */}
          <div className="bg-purple-950 border border-purple-800 rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="text-2xl">📋</span>
            <div>
              <p className="text-sm font-semibold text-purple-300">Review your booking</p>
              <p className="text-xs text-purple-500 mt-0.5">
                Nothing is booked yet — your event is only created once payment succeeds.
              </p>
            </div>
          </div>

          {payError && (
            <div className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-xl px-4 py-3">
              {payError}
            </div>
          )}

          {/* Event summary card */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800">
              <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-1">Event</p>
              <p className="text-lg font-bold">{pendingEvent.title}</p>
              {pendingEvent.description && (
                <p className="text-sm text-gray-400 mt-0.5">{pendingEvent.description}</p>
              )}
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Event type</span>
                <span className="capitalize">{pendingEvent.event_type}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Starts</span>
                <span>{new Date(pendingEvent.starts_at).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Ends</span>
                <span>{new Date(pendingEvent.ends_at).toLocaleString()}</span>
              </div>
              <div className="border-t border-gray-800 pt-3">
                <div className="flex justify-between text-sm text-gray-500 mb-1">
                  <span>Duration</span>
                  <span>{pendingEvent.hours}h × $20/hr</span>
                </div>
                <div className="flex justify-between text-base font-bold">
                  <span>Venue fee due</span>
                  <span className="text-purple-400">${Number(pendingEvent.venue_fee).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* What you get */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl px-4 py-3 space-y-1.5">
            {[
              'Streaming venue activated immediately',
              'AWS IVS channel provisioned for live output',
              'Ticket sales open to buyers',
              '90% of every ticket goes straight to you',
            ].map((line) => (
              <div key={line} className="flex items-center gap-2 text-xs text-gray-400">
                <span className="text-green-500 shrink-0">✓</span>
                {line}
              </div>
            ))}
          </div>

          {/* Pay button */}
          <button
            onClick={handlePayNow}
            disabled={payLoading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-base transition-colors flex items-center justify-center gap-2"
          >
            {payLoading ? (
              'Creating event & redirecting to checkout…'
            ) : (
              <>Pay ${Number(pendingEvent.venue_fee).toFixed(2)} — Activate Event</>
            )}
          </button>

          {/* Bypass — testing only */}
          <div className="border border-dashed border-gray-700 rounded-xl px-4 py-3 space-y-2">
            <p className="text-xs text-gray-600 text-center font-medium tracking-wide uppercase">Testing only</p>
            <button
              onClick={handleBypassActivate}
              disabled={bypassLoading || payLoading}
              className="w-full bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-300 py-2.5 rounded-xl text-sm font-medium transition-colors border border-gray-700"
            >
              {bypassLoading ? 'Saving…' : 'Bypass Payment & Activate'}
            </button>
            {bypassError && (
              <p className="text-red-400 text-xs text-center">{bypassError}</p>
            )}
          </div>

          <div className="text-center">
            <button
              onClick={handleStartOver}
              className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
            >
              ← Edit event details
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
