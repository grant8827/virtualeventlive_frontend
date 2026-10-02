import { useState, useEffect } from 'react'
import { apiUrl, mediaUrl } from '../api/url'
import SaleCard from '../components/SaleCard'
import FindMyTicketsModal from '../components/FindMyTicketsModal'

export default function Tickets() {
  const [events, setEvents] = useState([])
  const [eventsLoading, setEventsLoading] = useState(true)

  // Find My Tickets emails tickets to the buyer (never lists them here).
  const [showFindModal, setShowFindModal] = useState(false)

  useEffect(() => {
    fetch(apiUrl('/api/v1/events/public'))
      .then((r) => r.json())
      .then((d) => setEvents(d.events || []))
      .catch(() => {})
      .finally(() => setEventsLoading(false))
  }, [])

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">

      <div className="flex items-start justify-between gap-4 mb-10">
        <div>
          <h1 className="text-4xl font-extrabold mb-2">Tickets</h1>
          <p className="text-gray-400">Find your tickets or discover your next event.</p>
        </div>
        <button
          onClick={() => setShowFindModal(true)}
          className="shrink-0 bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-full text-sm font-semibold transition-colors"
        >
          Find My Tickets
        </button>
      </div>

      {/* Browse events */}
      <section>
        <div className="mb-8">
          <h2 className="text-3xl font-extrabold mb-2">Upcoming Events</h2>
          <p className="text-gray-400">Get your tickets before they sell out.</p>
        </div>

        {eventsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden animate-pulse">
                <div className="h-36 bg-gray-800" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-gray-800 rounded w-3/4" />
                  <div className="h-3 bg-gray-800 rounded w-1/2" />
                  <div className="h-9 bg-gray-800 rounded-xl mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-gray-800 rounded-2xl">
            <div className="text-5xl mb-4">🎟️</div>
            <p className="text-gray-400 text-lg font-medium mb-1">No upcoming events yet</p>
            <p className="text-gray-600 text-sm">Check back soon — events are added regularly.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {events.map((ev) => (
              <SaleCard
                key={ev.id}
                title={ev.title}
                starts_at={ev.starts_at}
                ticket_price={ev.ticket_price}
                ticket_type={ev.ticket_type}
                card_bg_from={ev.card_bg_from}
                card_bg_to={ev.card_bg_to}
                card_bg_image={mediaUrl(ev.card_bg_image)}
                ctaHref={`/events/${ev.id}`}
              />
            ))}
          </div>
        )}
      </section>

      {showFindModal && <FindMyTicketsModal onClose={() => setShowFindModal(false)} />}
    </div>
  )
}
