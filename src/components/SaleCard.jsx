import { Link } from 'react-router-dom'

// The storefront/promo card — what a buyer sees while browsing events on
// the public Tickets page and deciding whether to buy. Distinct from
// TicketCard, which is the actual ticket they receive once they've paid.
export default function SaleCard({
  title,
  starts_at,
  ticket_price,
  ticket_type,
  card_bg_from,
  card_bg_to,
  card_bg_image,
  ctaHref,
  ctaText = 'Get Tickets',
}) {
  const bgFrom = card_bg_from || '#7c3aed'
  const bgTo = card_bg_to || '#1e1b4b'
  const bgStyle = card_bg_image
    ? { backgroundImage: `url(${card_bg_image})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { backgroundImage: `linear-gradient(to bottom right, ${bgFrom}, ${bgTo})` }

  const dateStr = starts_at
    ? new Date(starts_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    : 'Date TBD'
  const timeStr = starts_at
    ? new Date(starts_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    : null

  const price = ticket_price > 0 ? `$${Number(ticket_price).toFixed(2)}` : 'Free'

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden flex flex-col hover:border-gray-600 transition-colors">
      <div style={bgStyle} className="h-36 flex items-end p-4">
        <span className="bg-black/50 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full">
          {ticket_type || 'Virtual Only'}
        </span>
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <h3 className="font-bold text-base leading-snug mb-2 line-clamp-2">{title || 'Event Name'}</h3>

        <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          <span>{dateStr}{timeStr ? ` · ${timeStr}` : ''}</span>
        </div>

        <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-5">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /><circle cx="12" cy="9" r="2.5" />
          </svg>
          <span>VirtualEventLive</span>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3">
          <span className="text-white font-bold text-lg">{price}</span>
          {ctaHref ? (
            <Link
              to={ctaHref}
              className="bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors"
            >
              {ctaText}
            </Link>
          ) : (
            <span className="bg-gray-800 text-gray-500 text-sm font-semibold px-5 py-2 rounded-xl cursor-default">
              {ctaText}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
