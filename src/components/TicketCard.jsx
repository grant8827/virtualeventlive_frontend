export default function TicketCard({ title, starts_at, ticket_price, ticket_type, card_bg_from, card_bg_to, card_bg_image }) {
  const bgFrom = card_bg_from || '#f43f5e'
  const bgTo   = card_bg_to   || '#4338ca'

  const imgStyle = card_bg_image
    ? { backgroundImage: `url(${card_bg_image})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { backgroundImage: `linear-gradient(to bottom right, ${bgFrom}, ${bgTo})` }

  const dateStr = starts_at
    ? new Date(starts_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    : 'Date TBD'

  const timeStr = starts_at
    ? new Date(starts_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    : null

  const price = ticket_price > 0
    ? `$${Number(ticket_price).toFixed(2)}`
    : 'Free'

  return (
    <div className="w-full max-w-sm bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-gray-800 select-none">

      {/* Top section — image left, event info right */}
      <div className="flex">
        {/* Left: gradient / image square */}
        <div style={{ ...imgStyle, width: '110px', minHeight: '110px', flexShrink: 0 }} />

        {/* Right: event name + date + host */}
        <div className="flex-1 p-4 flex flex-col justify-center gap-1.5 min-w-0">
          <h3 className="text-white font-bold text-base leading-tight line-clamp-2">
            {title || 'Event Name'}
          </h3>
          <div className="flex items-center gap-1.5 text-gray-400 text-[11px]">
            <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            <span>{dateStr}{timeStr ? ` · ${timeStr}` : ''}</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-400 text-[11px]">
            <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /><circle cx="12" cy="9" r="2.5" />
            </svg>
            <span className="truncate">VirtualEventLive</span>
          </div>
        </div>
      </div>

      {/* Divider with ticket notch effect */}
      <div className="relative flex items-center px-4">
        <div className="w-4 h-4 rounded-full bg-black -ml-6 shrink-0" />
        <div className="flex-1 border-t border-dashed border-gray-700 mx-2" />
        <div className="w-4 h-4 rounded-full bg-black -mr-6 shrink-0" />
      </div>

      {/* Bottom section — ticket details */}
      <div className="px-4 pt-3 pb-4 grid grid-cols-3 gap-3">
        <div>
          <p className="text-[9px] uppercase tracking-widest text-gray-500 font-bold mb-1">Ticket Type</p>
          <p className="text-white text-[11px] font-semibold">{ticket_type || 'Virtual Only'}</p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-widest text-gray-500 font-bold mb-1">Price</p>
          <p className="text-white text-[11px] font-semibold">{price}</p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-widest text-gray-500 font-bold mb-1">Access</p>
          <p className="text-white text-[11px] font-semibold">Live Stream</p>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 pb-4 flex items-center justify-between gap-4">
        <p className="text-[9px] text-gray-600 leading-relaxed">
          This ticket is valid for one device at a time. Do not share your ticket. Non-transferable.
        </p>
        <button className="shrink-0 bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-bold px-3 py-2 rounded-xl transition-colors whitespace-nowrap">
          Buy Ticket
        </button>
      </div>

    </div>
  )
}
