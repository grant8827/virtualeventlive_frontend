import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import GoLiveStudio from './GoLiveStudio'
import TicketCard from '../components/TicketCard'
import AdCard from '../components/AdCard'
import { saveImage, getObjectURL, deleteImage, imgKey, adImgKey } from '../lib/imageStore'

const TABS = [
  { id: 'setup', label: 'Book Event' },
  { id: 'events', label: 'My Events' },
  { id: 'golive', label: '🔴 Go Live' },
  { id: 'tickets', label: 'Tickets/Flyer' },
  { id: 'payouts', label: 'Payouts' },
]

export default function DashboardPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState('golive')
  const [events, setEvents] = useState([])
  const [eventsLoading, setEventsLoading] = useState(true)

  // Event creation form state
  const [form, setForm] = useState({
    title: '',
    event_type: 'concert',
    description: '',
    date: '',
    start_time: '',
    end_time: '',
  })
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)
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

  // Payouts tab — gateway connection status + pending balance
  const [payoutStatus, setPayoutStatus] = useState(null)
  const [payoutStatusLoading, setPayoutStatusLoading] = useState(false)
  const [payoutBalance, setPayoutBalance] = useState(null)
  const [wipayInput, setWipayInput] = useState('')
  const [paypalInput, setPaypalInput] = useState('')
  const [gatewayConnecting, setGatewayConnecting] = useState('')
  const [gatewayConnectError, setGatewayConnectError] = useState('')
  const [payoutTriggerLoading, setPayoutTriggerLoading] = useState(false)
  const [payoutTriggerMessage, setPayoutTriggerMessage] = useState('')
  const [payoutSecurityLoading, setPayoutSecurityLoading] = useState(false)
  const [payoutPasscodeSet, setPayoutPasscodeSet] = useState(null)
  const [payoutUnlocked, setPayoutUnlocked] = useState(false)
  const [payoutToken, setPayoutToken] = useState('')
  const [payoutPasscode, setPayoutPasscode] = useState('')
  const [payoutPasscodeConfirm, setPayoutPasscodeConfirm] = useState('')
  const [payoutAccountPassword, setPayoutAccountPassword] = useState('')
  const [payoutSecurityError, setPayoutSecurityError] = useState('')

  useEffect(() => {
    if (searchParams.get('venue_paid') === '1') {
      setSearchParams({}, { replace: true })
      setActiveTab('golive')
    }
  }, [])

  useEffect(() => {
    fetchEvents()
  }, [])

  useEffect(() => {
    if (!payoutToken) return undefined
    const timer = window.setTimeout(() => lockPayouts(), 5 * 60 * 1000)
    return () => window.clearTimeout(timer)
  }, [payoutToken])

  function lockPayouts() {
    setPayoutUnlocked(false)
    setPayoutToken('')
    setPayoutStatus(null)
    setPayoutBalance(null)
    setPayoutPasscode('')
    setPayoutPasscodeConfirm('')
    setPayoutAccountPassword('')
    setPayoutSecurityError('')
  }

  async function handleTabChange(tabID) {
    if (tabID !== 'payouts') {
      if (activeTab === 'payouts') lockPayouts()
      setActiveTab(tabID)
      return
    }

    lockPayouts()
    setActiveTab('payouts')
    setPayoutSecurityLoading(true)
    setPayoutPasscodeSet(null)
    try {
      const data = await api.get('/connect/security/status')
      setPayoutPasscodeSet(Boolean(data.passcode_set))
    } catch (err) {
      setPayoutSecurityError(err.message)
    } finally {
      setPayoutSecurityLoading(false)
    }
  }

  async function handlePayoutSecuritySubmit(e) {
    e.preventDefault()
    setPayoutSecurityError('')
    setPayoutSecurityLoading(true)
    try {
      const data = payoutPasscodeSet
        ? await api.post('/connect/security/unlock', { passcode: payoutPasscode })
        : await api.post('/connect/security/passcode', {
            passcode: payoutPasscode,
            confirm_passcode: payoutPasscodeConfirm,
            password: payoutAccountPassword,
          })
      setPayoutToken(data.payout_token)
      setPayoutUnlocked(true)
      setPayoutPasscodeSet(true)
      setPayoutPasscode('')
      setPayoutPasscodeConfirm('')
      setPayoutAccountPassword('')
      await fetchPayoutStatus(data.payout_token)
    } catch (err) {
      setPayoutSecurityError(err.message)
    } finally {
      setPayoutSecurityLoading(false)
    }
  }

  async function fetchPayoutStatus(token = payoutToken) {
    if (!token) return
    setPayoutStatusLoading(true)
    try {
      const [status, balance] = await Promise.all([
        api.secureGet('/connect/status', token),
        api.secureGet('/connect/balance', token),
      ])
      setPayoutStatus(status)
      setPayoutBalance(balance)
    } catch {
      setPayoutStatus(null)
      setPayoutBalance(null)
    } finally {
      setPayoutStatusLoading(false)
    }
  }

  async function handleConnectWiPay() {
    if (!wipayInput.trim()) return
    setGatewayConnectError('')
    setGatewayConnecting('wipay')
    try {
      await api.securePost('/connect/wipay', { account_id: wipayInput.trim() }, payoutToken)
      setWipayInput('')
      await fetchPayoutStatus()
    } catch (err) {
      setGatewayConnectError(err.message)
    } finally {
      setGatewayConnecting('')
    }
  }

  async function handleConnectPayPal() {
    if (!paypalInput.trim()) return
    setGatewayConnectError('')
    setGatewayConnecting('paypal')
    try {
      await api.securePost('/connect/paypal', { account_id: paypalInput.trim() }, payoutToken)
      setPaypalInput('')
      await fetchPayoutStatus()
    } catch (err) {
      setGatewayConnectError(err.message)
    } finally {
      setGatewayConnecting('')
    }
  }

  async function handleTriggerPayout() {
    setPayoutTriggerMessage('')
    setPayoutTriggerLoading(true)
    try {
      const data = await api.securePost('/connect/payout', {}, payoutToken)
      setPayoutTriggerMessage(`Sent $${Number(data.amount).toFixed(2)} via ${data.gateway}.`)
      await fetchPayoutStatus()
    } catch (err) {
      setPayoutTriggerMessage(err.message)
    } finally {
      setPayoutTriggerLoading(false)
    }
  }

  async function fetchEvents() {
    setEventsLoading(true)
    try {
      const data = await api.get('/events')
      setEvents(data.events || [])
    } catch {
      setEvents([])
    } finally {
      setEventsLoading(false)
    }
  }

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
      if (data.checkout_url) {
        // When Stripe is not configured the backend returns a local URL.
        // Use client-side navigation to avoid a cross-port redirect in dev.
        try {
          const url = new URL(data.checkout_url)
          if (url.hostname === window.location.hostname) {
            navigate(url.pathname + url.search)
            return
          }
        } catch (_) {}
        window.location.href = data.checkout_url
      }
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
      setActiveTab('events')
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

  async function handleCheckout(eventId) {
    try {
      const data = await api.post(`/events/${eventId}/checkout`, {})
      if (data.checkout_url) {
        try {
          const url = new URL(data.checkout_url)
          if (url.hostname === window.location.hostname) {
            navigate(url.pathname + url.search)
            return
          }
        } catch (_) {}
        window.location.href = data.checkout_url
      }
    } catch (err) {
      alert(err.message)
    }
  }

  async function handleStripeConnect() {
    try {
      const data = await api.securePost('/connect/onboard', {}, payoutToken)
      if (data.url) window.location.href = data.url
    } catch (err) {
      alert(err.message)
    }
  }

  // Tickets/Flyer tab state
  const [ticketsSubTab, setTicketsSubTab] = useState('ticket')
  const [selectedEventId, setSelectedEventId] = useState('')
  const [ticketForm, setTicketForm] = useState({
    ticket_name: 'General Admission',
    ticket_price: '',
    ticket_type: 'Virtual Only',
    bg_type: 'gradient',
    card_bg_from: '#f43f5e',
    card_bg_to: '#4338ca',
    card_bg_image: '',
  })
  const [ticketSaving, setTicketSaving] = useState(false)
  const [ticketMsg, setTicketMsg] = useState(null) // { ok, text }
  const [ads, setAds] = useState([])
  const [adForm, setAdForm] = useState({ event_id: '', headline: '', body: '', image_url: '', cta_text: 'Get Tickets' })
  const [adSaving, setAdSaving] = useState(false)
  const [adMsg, setAdMsg] = useState(null)
  const [editingAdId, setEditingAdId] = useState(null)

  useEffect(() => {
    fetchAds()
  }, [])

  async function fetchAds() {
    try {
      const data = await api.get('/advertisements/mine')
      setAds(data.ads || [])
    } catch {
      setAds([])
    }
  }

  // Pre-fill ticket form when host picks an event
  async function handleSelectEvent(id) {
    setSelectedEventId(id)
    setTicketMsg(null)
    const ev = events.find((e) => e.id === id)
    if (!ev) return

    // Check IndexedDB for a previously uploaded image for this event
    const objectURL = await getObjectURL(imgKey(id))

    setTicketForm({
      ticket_name: ev.title,
      ticket_price: ev.ticket_price > 0 ? ev.ticket_price.toString() : '',
      ticket_type: ev.ticket_type || 'Virtual Only',
      bg_type: objectURL ? 'image' : 'gradient',
      card_bg_from: ev.card_bg_from || '#f43f5e',
      card_bg_to: ev.card_bg_to || '#4338ca',
      card_bg_image: objectURL || '',
    })
  }

  async function handleImageFile(file) {
    if (!file || !selectedEventId) return
    // Save blob to IndexedDB
    await saveImage(imgKey(selectedEventId), file)
    // Create object URL for live preview
    const objectURL = URL.createObjectURL(file)
    setTicketForm((f) => ({ ...f, card_bg_image: objectURL, bg_type: 'image' }))
  }

  async function handleRemoveImage() {
    if (selectedEventId) await deleteImage(imgKey(selectedEventId))
    setTicketForm((f) => ({ ...f, card_bg_image: '', bg_type: 'gradient' }))
  }

  async function handleTicketSetup(e) {
    e.preventDefault()
    if (!selectedEventId) return
    setTicketSaving(true)
    setTicketMsg(null)
    try {
      const ev = events.find((e) => e.id === selectedEventId)
      await api.patch(`/events/${selectedEventId}/ticket`, {
        ticket_name: ev?.title || 'General Admission',
        ticket_price: parseFloat(ticketForm.ticket_price) || 0,
        ticket_type: ticketForm.ticket_type || 'Virtual Only',
        card_bg_from: ticketForm.card_bg_from,
        card_bg_to: ticketForm.card_bg_to,
        card_bg_image: '',  // image lives in IndexedDB, not the backend
      })
      setTicketMsg({ ok: true, text: 'Ticket saved!' })
      fetchEvents()
    } catch (err) {
      setTicketMsg({ ok: false, text: err.message })
    } finally {
      setTicketSaving(false)
    }
  }

  // Pre-fill / clear the ad form when host picks an event — pops up its existing flyer, if any
  async function handleSelectAdEvent(id) {
    setAdMsg(null)
    const existing = ads.find((a) => a.event_id === id)

    // Check IndexedDB for a previously uploaded flyer image for this event
    const objectURL = await getObjectURL(adImgKey(id))

    if (existing) {
      setEditingAdId(existing.id)
      setAdForm({
        event_id: id,
        headline: existing.headline || '',
        body: existing.body || '',
        image_url: objectURL || existing.image_url || '',
        cta_text: existing.cta_text || 'Get Tickets',
      })
    } else {
      setEditingAdId(null)
      setAdForm({ event_id: id, headline: '', body: '', image_url: objectURL || '', cta_text: 'Get Tickets' })
    }
  }

  async function handleAdImageFile(file) {
    if (!file || !adForm.event_id) return
    // Save blob to IndexedDB — the flyer image lives on this device, not the backend
    await saveImage(adImgKey(adForm.event_id), file)
    // Create object URL for live preview
    const objectURL = URL.createObjectURL(file)
    setAdForm((f) => ({ ...f, image_url: objectURL }))
  }

  async function handleRemoveAdImage() {
    if (adForm.event_id) await deleteImage(adImgKey(adForm.event_id))
    setAdForm((f) => ({ ...f, image_url: '' }))
  }

  async function handleCreateAd(e) {
    e.preventDefault()
    if (!adForm.event_id) {
      setAdMsg({ ok: false, text: 'Select an event to link this flyer to.' })
      return
    }
    setAdSaving(true)
    setAdMsg(null)
    // Local blob: URLs only exist in this tab — never send them to the backend
    const remoteImageURL = adForm.image_url.startsWith('blob:') ? '' : adForm.image_url
    try {
      if (editingAdId) {
        await api.put(`/advertisements/${editingAdId}`, {
          headline: adForm.headline,
          body: adForm.body,
          image_url: remoteImageURL,
          cta_text: adForm.cta_text || 'Get Tickets',
        })
        setAdMsg({ ok: true, text: 'Flyer updated!' })
      } else {
        const data = await api.post('/advertisements', {
          event_id: adForm.event_id,
          headline: adForm.headline,
          body: adForm.body,
          image_url: remoteImageURL,
          cta_text: adForm.cta_text || 'Get Tickets',
        })
        setEditingAdId(data.id)
        setAdMsg({ ok: true, text: 'Flyer published!' })
      }
      fetchAds()
    } catch (err) {
      setAdMsg({ ok: false, text: err.message })
    } finally {
      setAdSaving(false)
    }
  }

  async function handleDeleteAd(id) {
    try {
      const ad = ads.find((a) => a.id === id)
      await api.del(`/advertisements/${id}`)
      if (ad?.event_id) await deleteImage(adImgKey(ad.event_id))
      setAds((prev) => prev.filter((a) => a.id !== id))
      if (id === editingAdId) {
        setEditingAdId(null)
        setAdForm((f) => ({ ...f, headline: '', body: '', image_url: '', cta_text: 'Get Tickets' }))
      }
    } catch (err) {
      alert(err.message)
    }
  }

  const salesStats = events.reduce(
    (acc, ev) => {
      const gross = ev.ticket_count * ev.ticket_price
      const net = gross * 0.9 - (ev.venue_paid ? ev.venue_fee : 0)
      return {
        tickets: acc.tickets + ev.ticket_count,
        gross: acc.gross + gross,
        fees: acc.fees + gross * 0.1 + (ev.venue_paid ? ev.venue_fee : 0),
        net: acc.net + net,
      }
    },
    { tickets: 0, gross: 0, fees: 0, net: 0 }
  )

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Host Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          {events.length} event{events.length !== 1 ? 's' : ''} ·{' '}
          {events.filter((e) => e.venue_paid && !e.expired).length} active
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 mb-6 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex-1 min-w-20 text-sm font-medium py-2 px-3 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Setup ── */}
      {activeTab === 'setup' && (
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
      )}

      {/* ── My Events ── */}
      {activeTab === 'events' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">My Events</h2>
            <button
              onClick={() => setActiveTab('setup')}
              className="text-sm bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl transition-colors font-medium"
            >
              + Book New Event
            </button>
          </div>

          {eventsLoading ? (
            <p className="text-gray-500 text-sm">Loading…</p>
          ) : events.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-gray-800 rounded-2xl">
              <p className="text-gray-500 mb-3">No events booked yet.</p>
              <button
                onClick={() => setActiveTab('setup')}
                className="text-purple-400 hover:text-purple-300 text-sm transition-colors"
              >
                Book your first event →
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {events.map((ev) => {
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
                            onClick={() => setActiveTab('golive')}
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
        </div>
      )}

      {/* ── Go Live ── */}
      {activeTab === 'golive' && <GoLiveStudio events={events} />}

      {/* ── Tickets / Flyer ── */}
      {activeTab === 'tickets' && (
        <div className="max-w-4xl mx-auto">
          {/* Sub-tab bar */}
          <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 mb-7">
            {[{ id: 'ticket', label: 'Create Ticket' }, { id: 'ad', label: 'Advertisement' }].map((st) => (
              <button
                key={st.id}
                onClick={() => setTicketsSubTab(st.id)}
                className={`flex-1 text-sm font-medium py-2 px-4 rounded-lg transition-colors ${
                  ticketsSubTab === st.id
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* ── Create Ticket sub-tab ── */}
          {ticketsSubTab === 'ticket' && (
            <div>
              {events.filter((e) => e.venue_paid && !e.expired).length === 0 ? (
                <div className="text-center py-16 border border-dashed border-gray-800 rounded-2xl">
                  <p className="text-gray-500 mb-2">No active events yet.</p>
                  <p className="text-xs text-gray-600">Book and activate an event first, then set up its ticket here.</p>
                </div>
              ) : (
                <div className="flex gap-8 items-start flex-wrap lg:flex-nowrap">

                  {/* ── Left: form ── */}
                  <div className="flex-1 min-w-0 space-y-5">
                    {/* Event selector */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-1.5">Select Event</label>
                      <select
                        value={selectedEventId}
                        onChange={(e) => handleSelectEvent(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 transition-colors"
                      >
                        <option value="">— choose an event —</option>
                        {events.filter((e) => e.venue_paid && !e.expired).map((ev) => (
                          <option key={ev.id} value={ev.id}>{ev.title}</option>
                        ))}
                      </select>
                    </div>

                    {/* Event date & time — read-only, pulled from the booked event */}
                    {selectedEventId && (() => {
                      const ev = events.find((e) => e.id === selectedEventId)
                      if (!ev) return null
                      const starts = new Date(ev.starts_at)
                      const ends = ev.ends_at ? new Date(ev.ends_at) : null
                      return (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm text-gray-400 mb-1.5">Event Date</label>
                            <div className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-gray-300 text-sm">
                              {starts.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm text-gray-400 mb-1.5">Event Time</label>
                            <div className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-gray-300 text-sm">
                              {starts.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                              {ends && <span className="text-gray-500"> → {ends.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</span>}
                            </div>
                          </div>
                        </div>
                      )
                    })()}

                    {/* Price */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-1.5">Price (USD)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={ticketForm.ticket_price}
                          onChange={(e) => setTicketForm((f) => ({ ...f, ticket_price: e.target.value }))}
                          placeholder="25.00"
                          className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-8 pr-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Ticket type */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-1.5">Ticket Type</label>
                      <select
                        value={ticketForm.ticket_type}
                        onChange={(e) => setTicketForm((f) => ({ ...f, ticket_type: e.target.value }))}
                        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 transition-colors"
                      >
                        <option value="Virtual Only">Virtual Only</option>
                        <option value="Virtual + Location">Virtual + Location</option>
                      </select>
                    </div>

                    {/* Background type toggle */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Card Background</label>
                      <div className="flex gap-2 mb-3">
                        {['gradient', 'image'].map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setTicketForm((f) => ({ ...f, bg_type: t }))}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                              ticketForm.bg_type === t
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-800 text-gray-400 hover:text-white'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>

                      {ticketForm.bg_type === 'gradient' && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1.5">From color</label>
                            <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2">
                              <input
                                type="color"
                                value={ticketForm.card_bg_from}
                                onChange={(e) => setTicketForm((f) => ({ ...f, card_bg_from: e.target.value }))}
                                className="w-7 h-7 rounded cursor-pointer bg-transparent border-0 p-0"
                              />
                              <span className="text-xs text-gray-400 font-mono">{ticketForm.card_bg_from}</span>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1.5">To color</label>
                            <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2">
                              <input
                                type="color"
                                value={ticketForm.card_bg_to}
                                onChange={(e) => setTicketForm((f) => ({ ...f, card_bg_to: e.target.value }))}
                                className="w-7 h-7 rounded cursor-pointer bg-transparent border-0 p-0"
                              />
                              <span className="text-xs text-gray-400 font-mono">{ticketForm.card_bg_to}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {ticketForm.bg_type === 'image' && (
                        <div className="space-y-2">
                          <label className="flex items-center justify-center gap-2 w-full bg-gray-900 border border-dashed border-gray-600 hover:border-purple-500 rounded-xl px-4 py-4 cursor-pointer transition-colors group">
                            <svg className="w-5 h-5 text-gray-500 group-hover:text-purple-400 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                            </svg>
                            <span className="text-sm text-gray-500 group-hover:text-gray-300 transition-colors">
                              {ticketForm.card_bg_image ? 'Change image' : 'Upload image from PC'}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleImageFile(e.target.files?.[0])}
                            />
                          </label>
                          {ticketForm.card_bg_image && (
                            <div className="flex items-center justify-between bg-gray-900 border border-gray-700 rounded-xl px-3 py-2">
                              <div className="flex items-center gap-2">
                                <img src={ticketForm.card_bg_image} alt="" className="w-8 h-8 rounded object-cover" />
                                <span className="text-xs text-gray-400">Image saved locally</span>
                              </div>
                              <button
                                type="button"
                                onClick={handleRemoveImage}
                                className="text-xs text-red-500 hover:text-red-400 transition-colors"
                              >
                                Remove
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {ticketMsg && (
                      <p className={`text-sm ${ticketMsg.ok ? 'text-green-400' : 'text-red-400'}`}>
                        {ticketMsg.text}
                      </p>
                    )}

                    <button
                      onClick={handleTicketSetup}
                      disabled={ticketSaving || !selectedEventId}
                      className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold transition-colors"
                    >
                      {ticketSaving ? 'Saving…' : 'Save Ticket'}
                    </button>
                  </div>

                  {/* ── Right: live card preview ── */}
                  <div className="w-full lg:w-80 shrink-0 flex flex-col gap-3">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">Preview</p>
                    <TicketCard
                      title={events.find((e) => e.id === selectedEventId)?.title || 'Event Name'}
                      starts_at={events.find((e) => e.id === selectedEventId)?.starts_at}
                      ticket_name={ticketForm.ticket_name}
                      ticket_price={parseFloat(ticketForm.ticket_price) || 0}
                      ticket_type={ticketForm.ticket_type}
                      card_bg_from={ticketForm.card_bg_from}
                      card_bg_to={ticketForm.card_bg_to}
                      card_bg_image={ticketForm.bg_type === 'image' ? ticketForm.card_bg_image : ''}
                    />
                    <p className="text-xs text-gray-600 text-center">Updates live as you type</p>
                  </div>

                </div>
              )}
            </div>
          )}

          {/* ── Advertisement sub-tab ── */}
          {ticketsSubTab === 'ad' && (
            <div className="space-y-8">
              {/* Create ad form + live preview */}
              <div className="flex gap-8 items-start flex-wrap lg:flex-nowrap">

                {/* ── Left: form ── */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold mb-5">{editingAdId ? 'Edit Flyer' : 'Create Advertisement'}</h3>
                  <form onSubmit={handleCreateAd} className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1.5">Link to Event</label>
                      <select
                        required
                        value={adForm.event_id}
                        onChange={(e) => handleSelectAdEvent(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 transition-colors"
                      >
                        <option value="" disabled>— choose an event —</option>
                        {events.filter((ev) => !ev.expired).map((ev) => (
                          <option key={ev.id} value={ev.id}>{ev.title}</option>
                        ))}
                      </select>
                    </div>

                    {editingAdId && (
                      <div className="flex items-center justify-between gap-3 bg-purple-950/30 border border-purple-800/40 rounded-xl px-4 py-2.5 text-xs text-purple-300">
                        <span>This event already has a flyer — edit the fields below or remove it.</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteAd(editingAdId)}
                          className="text-red-400 hover:text-red-300 font-semibold shrink-0"
                        >
                          Remove
                        </button>
                      </div>
                    )}

                    <fieldset disabled={!adForm.event_id} className="space-y-4 disabled:opacity-40">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1.5">
                          Headline <span className="text-gray-600">(optional)</span>
                        </label>
                        <input
                          type="text"
                          value={adForm.headline}
                          onChange={(e) => setAdForm((f) => ({ ...f, headline: e.target.value }))}
                          placeholder="Don't miss the biggest show of the year"
                          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1.5">Body Text (optional)</label>
                        <textarea
                          rows={3}
                          value={adForm.body}
                          onChange={(e) => setAdForm((f) => ({ ...f, body: e.target.value }))}
                          placeholder="Short description shown under the headline…"
                          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors resize-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1.5">
                          Flyer Image <span className="text-gray-600">(optional)</span>
                        </label>
                        <div className="space-y-2">
                          <label className="flex items-center justify-center gap-2 w-full bg-gray-900 border border-dashed border-gray-600 hover:border-purple-500 rounded-xl px-4 py-4 cursor-pointer transition-colors group/upload">
                            <svg className="w-5 h-5 text-gray-500 group-hover/upload:text-purple-400 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                            </svg>
                            <span className="text-sm text-gray-500 group-hover/upload:text-gray-300 transition-colors">
                              {adForm.image_url ? 'Change image' : 'Upload image from PC'}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleAdImageFile(e.target.files?.[0])}
                            />
                          </label>
                          {adForm.image_url && (
                            <div className="flex items-center justify-between bg-gray-900 border border-gray-700 rounded-xl px-3 py-2">
                              <div className="flex items-center gap-2">
                                <img src={adForm.image_url} alt="" className="w-8 h-8 rounded object-cover" />
                                <span className="text-xs text-gray-400">Image saved locally</span>
                              </div>
                              <button
                                type="button"
                                onClick={handleRemoveAdImage}
                                className="text-xs text-red-500 hover:text-red-400 transition-colors"
                              >
                                Remove
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1.5">Button Text</label>
                        <input
                          type="text"
                          value={adForm.cta_text}
                          onChange={(e) => setAdForm((f) => ({ ...f, cta_text: e.target.value }))}
                          placeholder="Get Tickets"
                          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
                        />
                      </div>
                    </fieldset>

                    {adMsg && (
                      <p className={`text-sm ${adMsg.ok ? 'text-green-400' : 'text-red-400'}`}>
                        {adMsg.text}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={adSaving || !adForm.event_id}
                      className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold transition-colors"
                    >
                      {adSaving ? 'Saving…' : editingAdId ? 'Update Flyer' : 'Publish Advertisement'}
                    </button>
                  </form>
                </div>

                {/* ── Right: live preview ── */}
                <div className="w-full lg:w-80 shrink-0 flex flex-col gap-3">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">Preview — as shown on Events</p>
                  <AdCard
                    headline={adForm.headline}
                    body={adForm.body}
                    image_url={adForm.image_url}
                    cta_text={adForm.cta_text || 'Get Tickets'}
                  />
                  <p className="text-xs text-gray-600 text-center">Updates live as you type</p>
                </div>

              </div>

              {/* Existing ads — hidden once their event's date has passed, same as the Link to Event dropdown */}
              {ads.filter((ad) => !ad.event_expired).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-4">Your Ads ({ads.filter((ad) => !ad.event_expired).length})</h3>
                  <div className="space-y-3">
                    {ads.filter((ad) => !ad.event_expired).map((ad) => (
                      <div key={ad.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden flex">
                        <AdThumb ad={ad} />
                        <div className="flex-1 px-4 py-3 min-w-0">
                          {ad.headline && <p className="font-semibold text-sm truncate">{ad.headline}</p>}
                          {ad.body && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{ad.body}</p>}
                          {ad.event_title && (
                            <p className="text-xs text-purple-400 mt-1">→ {ad.event_title}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 px-3 shrink-0">
                          <button
                            onClick={() => ad.event_id && handleSelectAdEvent(ad.event_id)}
                            className="px-2 text-gray-500 hover:text-purple-400 transition-colors text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteAd(ad.id)}
                            className="px-2 text-gray-600 hover:text-red-400 transition-colors text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Payouts ── */}
      {activeTab === 'payouts' && payoutUnlocked && (
        <div className="max-w-4xl">
          <h2 className="text-lg font-semibold mb-2">Payouts</h2>
          <p className="text-gray-400 text-sm mb-6 leading-relaxed">
            Connect a payout account to receive ticket revenue. Choose Stripe, WiPay, or PayPal —
            whichever one you connect most recently becomes your active gateway.
          </p>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-2 text-sm text-gray-300 mb-4">
            <div className="flex justify-between">
              <span className="text-gray-500">Venue fee</span>
              <span>$20/hr (ceiling)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Platform commission</span>
              <span>10% per ticket</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Your cut</span>
              <span className="text-green-400 font-semibold">90% of ticket revenue</span>
            </div>
          </div>

          {gatewayConnectError && (
            <p className="text-red-400 text-sm mb-4">{gatewayConnectError}</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          {/* Stripe */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col items-center text-center min-w-0">
            <h3 className="font-semibold">Stripe</h3>
            {payoutStatus?.stripe?.connected && (
              <span className={`text-xs px-2 py-1 rounded-full mt-2 ${payoutStatus.active_gateway === 'stripe' ? 'bg-green-900 text-green-400' : 'bg-gray-800 text-gray-400'}`}>
                {payoutStatus.active_gateway === 'stripe' ? 'Active' : 'Connected'}
              </span>
            )}
            <p className="text-gray-500 text-xs my-4 flex-1">
              Funds transfer to your Stripe account automatically after each sale.
            </p>
            <button
              onClick={handleStripeConnect}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-semibold transition-colors"
            >
              {payoutStatus?.stripe?.connected ? 'Manage Stripe Account →' : 'Connect Stripe Account →'}
            </button>
          </div>

          {/* WiPay */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col items-center text-center min-w-0">
            <h3 className="font-semibold">WiPay</h3>
            {payoutStatus?.wipay?.connected && (
              <span className={`text-xs px-2 py-1 rounded-full mt-2 ${payoutStatus.active_gateway === 'wipay' ? 'bg-green-900 text-green-400' : 'bg-gray-800 text-gray-400'}`}>
                {payoutStatus.active_gateway === 'wipay' ? 'Active' : 'Connected'}
              </span>
            )}
            <p className="text-gray-500 text-xs my-4 flex-1">
              Caribbean payout rail. Ticket sales settle to the platform first; payouts to your
              WiPay account are sent in a batch you trigger below.
            </p>
            {payoutStatus?.wipay?.connected ? (
              <p className="text-sm text-gray-300 w-full break-all">Account: {payoutStatus.wipay.account_id}</p>
            ) : (
              <div className="flex flex-col gap-2 w-full">
                <input
                  type="text"
                  value={wipayInput}
                  onChange={(e) => setWipayInput(e.target.value)}
                  placeholder="WiPay account number"
                  className="w-full min-w-0 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-center"
                />
                <button
                  onClick={handleConnectWiPay}
                  disabled={gatewayConnecting === 'wipay'}
                  className="w-full bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
                >
                  {gatewayConnecting === 'wipay' ? 'Connecting…' : 'Connect'}
                </button>
              </div>
            )}
          </div>

          {/* PayPal */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col items-center text-center min-w-0">
            <h3 className="font-semibold">PayPal</h3>
            {payoutStatus?.paypal?.connected && (
              <span className={`text-xs px-2 py-1 rounded-full mt-2 ${payoutStatus.active_gateway === 'paypal' ? 'bg-green-900 text-green-400' : 'bg-gray-800 text-gray-400'}`}>
                {payoutStatus.active_gateway === 'paypal' ? 'Active' : 'Connected'}
              </span>
            )}
            <p className="text-gray-500 text-xs my-4 flex-1">
              Ticket sales settle to the platform first; payouts to your PayPal email are sent in
              a batch you trigger below.
            </p>
            {payoutStatus?.paypal?.connected ? (
              <p className="text-sm text-gray-300 w-full break-all">Account: {payoutStatus.paypal.account_id}</p>
            ) : (
              <div className="flex flex-col gap-2 w-full">
                <input
                  type="email"
                  value={paypalInput}
                  onChange={(e) => setPaypalInput(e.target.value)}
                  placeholder="PayPal email"
                  className="w-full min-w-0 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-center"
                />
                <button
                  onClick={handleConnectPayPal}
                  disabled={gatewayConnecting === 'paypal'}
                  className="w-full bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
                >
                  {gatewayConnecting === 'paypal' ? 'Connecting…' : 'Connect'}
                </button>
              </div>
            )}
          </div>
          </div>

          {/* Pending balance + manual payout trigger — WiPay/PayPal only */}
          {payoutStatus?.active_gateway && payoutStatus.active_gateway !== 'stripe' && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Pending balance</h3>
                <span className="text-green-400 font-semibold">
                  ${Number(payoutBalance?.pending_amount || 0).toFixed(2)}
                </span>
              </div>
              <button
                onClick={handleTriggerPayout}
                disabled={payoutTriggerLoading || !(payoutBalance?.pending_amount > 0)}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-semibold transition-colors disabled:opacity-50"
              >
                {payoutTriggerLoading ? 'Sending…' : `Request Payout via ${payoutStatus.active_gateway}`}
              </button>
              {payoutTriggerMessage && (
                <p className="text-sm text-gray-400 mt-3">{payoutTriggerMessage}</p>
              )}
            </div>
          )}

          {payoutStatusLoading && (
            <p className="text-xs text-gray-600 text-center mb-4">Loading payout status…</p>
          )}
          <p className="text-xs text-gray-600 text-center">
            Your banking info is never stored on our servers.
          </p>
        </div>
      )}

      {activeTab === 'payouts' && !payoutUnlocked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
            <div className="mb-5 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-purple-950 text-2xl">🔒</div>
              <h2 className="text-xl font-bold">
                {payoutPasscodeSet === false ? 'Create payout passcode' : 'Unlock payouts'}
              </h2>
              <p className="mt-2 text-sm text-gray-400">
                {payoutPasscodeSet === false
                  ? 'Create a 6-digit code to protect payout accounts and transfers.'
                  : 'Enter your 6-digit payout passcode. This section locks again when you leave it.'}
              </p>
            </div>

            {payoutPasscodeSet === null ? (
              payoutSecurityLoading ? (
                <p className="py-6 text-center text-sm text-gray-400">Checking payout security…</p>
              ) : (
                <div className="space-y-3 text-center">
                  <p className="text-sm text-red-400">{payoutSecurityError || 'Unable to check payout security.'}</p>
                  <button
                    type="button"
                    onClick={() => handleTabChange('payouts')}
                    className="w-full rounded-xl bg-purple-600 py-3 font-semibold text-white hover:bg-purple-700"
                  >
                    Try Again
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTabChange('golive')}
                    className="w-full py-2 text-sm text-gray-500 hover:text-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              )
            ) : (
              <form onSubmit={handlePayoutSecuritySubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm text-gray-400">6-digit passcode</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    required
                    autoFocus
                    value={payoutPasscode}
                    onChange={(e) => setPayoutPasscode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-3 text-center text-2xl tracking-[0.5em] focus:border-purple-500 focus:outline-none"
                  />
                </div>

                {payoutPasscodeSet === false && (
                  <>
                    <div>
                      <label className="mb-1.5 block text-sm text-gray-400">Confirm passcode</label>
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={6}
                        pattern="[0-9]{6}"
                        required
                        value={payoutPasscodeConfirm}
                        onChange={(e) => setPayoutPasscodeConfirm(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-3 text-center text-2xl tracking-[0.5em] focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm text-gray-400">Current account password</label>
                      <input
                        type="password"
                        autoComplete="current-password"
                        required
                        value={payoutAccountPassword}
                        onChange={(e) => setPayoutAccountPassword(e.target.value)}
                        className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-3 focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                  </>
                )}

                {payoutSecurityError && <p className="text-sm text-red-400">{payoutSecurityError}</p>}
                <button
                  type="submit"
                  disabled={payoutSecurityLoading || payoutPasscode.length !== 6}
                  className="w-full rounded-xl bg-purple-600 py-3 font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  {payoutSecurityLoading ? 'Please wait…' : payoutPasscodeSet === false ? 'Create & Unlock' : 'Unlock Payouts'}
                </button>
                <button
                  type="button"
                  onClick={() => handleTabChange('golive')}
                  className="w-full py-2 text-sm text-gray-500 hover:text-gray-300"
                >
                  Cancel
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Flyer thumbnail for the "Your Ads" list — falls back to the image stored in this
// browser's IndexedDB when the server has no image_url for the ad.
function AdThumb({ ad }) {
  const [localImage, setLocalImage] = useState(null)

  useEffect(() => {
    if (ad.image_url || !ad.event_id) return
    let objectURL = null
    let cancelled = false
    getObjectURL(adImgKey(ad.event_id)).then((url) => {
      if (cancelled) return
      objectURL = url
      setLocalImage(url)
    })
    return () => {
      cancelled = true
      if (objectURL) URL.revokeObjectURL(objectURL)
    }
  }, [ad.image_url, ad.event_id])

  const img = ad.image_url || localImage
  if (!img) return null

  return (
    <div className="w-24 h-24 bg-gray-950 flex items-center justify-center overflow-hidden shrink-0">
      <img src={img} alt="" className="w-full h-full object-contain" />
    </div>
  )
}
