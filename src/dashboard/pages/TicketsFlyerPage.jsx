import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { mediaUrl } from '../../api/url'
import TicketCard from '../../components/TicketCard'
import SaleCard from '../../components/SaleCard'
import AdCard from '../../components/AdCard'
import { useDashboard } from '../DashboardContext'

export default function TicketsFlyerPage() {
  const { events, fetchEvents } = useDashboard()

  const [ticketsSubTab, setTicketsSubTab] = useState('ticket')
  const [selectedEventId, setSelectedEventId] = useState('')
  const [ticketForm, setTicketForm] = useState({
    ticket_name: 'General Admission',
    ticket_price: '',
    ticket_type: 'Virtual Only',
    venue_address: '',
    bg_type: 'gradient',
    card_bg_from: '#f43f5e',
    card_bg_to: '#4338ca',
    card_bg_image: '',
    card_bg_image_ref: '',
  })
  const [ticketSaving, setTicketSaving] = useState(false)
  const [ticketMsg, setTicketMsg] = useState(null) // { ok, text }
  const [ads, setAds] = useState([])
  const [adForm, setAdForm] = useState({ event_id: '', headline: '', body: '', image_url: '', image_ref: '', cta_text: 'Get Tickets' })
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

    setTicketForm({
      ticket_name: ev.title,
      ticket_price: ev.ticket_price > 0 ? ev.ticket_price.toString() : '',
      ticket_type: ev.ticket_type || 'Virtual Only',
      venue_address: ev.venue_address || '',
      bg_type: ev.card_bg_image ? 'image' : 'gradient',
      card_bg_from: ev.card_bg_from || '#f43f5e',
      card_bg_to: ev.card_bg_to || '#4338ca',
      card_bg_image: mediaUrl(ev.card_bg_image),
      card_bg_image_ref: ev.card_bg_image || '',
    })
  }

  async function handleImageFile(file) {
    if (!file || !selectedEventId) return
    try {
      const data = await api.upload(`/events/${selectedEventId}/images/ticket`, file)
      setTicketForm((f) => ({
        ...f,
        card_bg_image: `${mediaUrl(data.image_url)}?v=${Date.now()}`,
        card_bg_image_ref: data.image_url,
        bg_type: 'image',
      }))
    } catch (err) {
      setTicketMsg({ ok: false, text: err.message })
    }
  }

  async function handleRemoveImage() {
    if (selectedEventId) await api.del(`/events/${selectedEventId}/images/ticket`)
    setTicketForm((f) => ({ ...f, card_bg_image: '', card_bg_image_ref: '', bg_type: 'gradient' }))
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
        venue_address: ticketForm.venue_address,
        card_bg_from: ticketForm.card_bg_from,
        card_bg_to: ticketForm.card_bg_to,
        card_bg_image: ticketForm.bg_type === 'image' ? ticketForm.card_bg_image_ref : '',
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

    if (existing) {
      setEditingAdId(existing.id)
      setAdForm({
        event_id: id,
        headline: existing.headline || '',
        body: existing.body || '',
        image_url: mediaUrl(existing.image_url),
        image_ref: existing.image_url || '',
        cta_text: existing.cta_text || 'Get Tickets',
      })
    } else {
      setEditingAdId(null)
      setAdForm({ event_id: id, headline: '', body: '', image_url: '', image_ref: '', cta_text: 'Get Tickets' })
    }
  }

  async function handleAdImageFile(file) {
    if (!file || !adForm.event_id) return
    try {
      const data = await api.upload(`/events/${adForm.event_id}/images/flyer`, file)
      setAdForm((f) => ({
        ...f,
        image_url: `${mediaUrl(data.image_url)}?v=${Date.now()}`,
        image_ref: data.image_url,
      }))
    } catch (err) {
      setAdMsg({ ok: false, text: err.message })
    }
  }

  async function handleRemoveAdImage() {
    if (adForm.event_id) await api.del(`/events/${adForm.event_id}/images/flyer`)
    setAdForm((f) => ({ ...f, image_url: '', image_ref: '' }))
  }

  async function handleCreateAd(e) {
    e.preventDefault()
    if (!adForm.event_id) {
      setAdMsg({ ok: false, text: 'Select an event to link this flyer to.' })
      return
    }
    setAdSaving(true)
    setAdMsg(null)
    try {
      if (editingAdId) {
        await api.put(`/advertisements/${editingAdId}`, {
          headline: adForm.headline,
          body: adForm.body,
          image_url: adForm.image_ref,
          cta_text: adForm.cta_text || 'Get Tickets',
        })
        setAdMsg({ ok: true, text: 'Flyer updated!' })
      } else {
        const data = await api.post('/advertisements', {
          event_id: adForm.event_id,
          headline: adForm.headline,
          body: adForm.body,
          image_url: adForm.image_ref,
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
      if (ad?.event_id) await api.del(`/events/${ad.event_id}/images/flyer`).catch(() => {})
      setAds((prev) => prev.filter((a) => a.id !== id))
      if (id === editingAdId) {
        setEditingAdId(null)
        setAdForm((f) => ({ ...f, headline: '', body: '', image_url: '', image_ref: '', cta_text: 'Get Tickets' }))
      }
    } catch (err) {
      alert(err.message)
    }
  }

  return (
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

                {/* Venue address — only matters once there's a door to check in at */}
                {ticketForm.ticket_type === 'Virtual + Location' && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Venue Address</label>
                    <input
                      type="text"
                      value={ticketForm.venue_address}
                      onChange={(e) => setTicketForm((f) => ({ ...f, venue_address: e.target.value }))}
                      placeholder="123 Victory Lane, Gridiron City, USA"
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
                    />
                    <p className="text-xs text-gray-600 mt-1.5">Printed on the ticket. Attendees scan a QR at the door — see it live in the preview →</p>
                  </div>
                )}

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
                            <span className="text-xs text-gray-400">Image saved to cloud storage</span>
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
              <div className="w-full lg:w-105 shrink-0 flex flex-col gap-3">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">Preview</p>
                <TicketCard
                  title={events.find((e) => e.id === selectedEventId)?.title || 'Event Name'}
                  eventType={events.find((e) => e.id === selectedEventId)?.event_type}
                  starts_at={events.find((e) => e.id === selectedEventId)?.starts_at}
                  ticket_price={parseFloat(ticketForm.ticket_price) || 0}
                  ticket_type={ticketForm.ticket_type}
                  venue_address={ticketForm.venue_address}
                  card_bg_from={ticketForm.card_bg_from}
                  card_bg_to={ticketForm.card_bg_to}
                  card_bg_image={ticketForm.bg_type === 'image' ? ticketForm.card_bg_image : ''}
                  preview
                />
                <p className="text-xs text-gray-600 text-center">Updates live as you type</p>

                {/* ── Display card — the storefront card shown on the public Tickets page ── */}
                <p className="text-xs text-gray-500 font-medium uppercase tracking-widest mt-5">Display Card</p>
                <p className="text-xs text-gray-600 -mt-2">
                  What buyers see while browsing and deciding to buy. Once they purchase, they receive the ticket above.
                </p>
                <SaleCard
                  title={events.find((e) => e.id === selectedEventId)?.title || 'Event Name'}
                  starts_at={events.find((e) => e.id === selectedEventId)?.starts_at}
                  ticket_price={parseFloat(ticketForm.ticket_price) || 0}
                  ticket_type={ticketForm.ticket_type}
                  card_bg_from={ticketForm.card_bg_from}
                  card_bg_to={ticketForm.card_bg_to}
                  card_bg_image={ticketForm.bg_type === 'image' ? ticketForm.card_bg_image : ''}
                  ctaHref={selectedEventId ? `/events/${selectedEventId}` : undefined}
                />
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
                              <span className="text-xs text-gray-400">Image saved to cloud storage</span>
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
  )
}

function AdThumb({ ad }) {
  const img = mediaUrl(ad.image_url)
  if (!img) return null

  return (
    <div className="w-24 h-24 bg-gray-950 flex items-center justify-center overflow-hidden shrink-0">
      <img src={img} alt="" className="w-full h-full object-contain" />
    </div>
  )
}
