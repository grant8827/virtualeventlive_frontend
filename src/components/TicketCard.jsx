import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import QRCode from 'qrcode'

// The single "real ticket" visual used everywhere a ticket is shown: the
// host's live preview while setting one up (TicketsFlyerPage), and the
// actual issued ticket a buyer sees (TicketSuccess, Tickets, Find My
// Tickets). Printed-ticket look on purpose — light stock, dark ink — both
// to match the reference design and because the QR code needs real
// contrast to scan reliably regardless of the app's dark theme.
export default function TicketCard({
  title,
  eventType,
  starts_at,
  ticket_price,
  ticket_type = 'Virtual Only',
  venue_address,
  card_bg_from,
  card_bg_to,
  card_bg_image,
  code,
  serialNo,
  used = false,
  usedChannel,
  expired = false,
  preview = false,
  joinHref,
}) {
  const accent = card_bg_from || '#f97316'
  const isHybrid = ticket_type === 'Virtual + Location'

  const dateStr = starts_at
    ? new Date(starts_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase()
    : 'DATE TBD'
  const timeStr = starts_at
    ? new Date(starts_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    : '—'
  const priceStr = ticket_price > 0 ? `$${Number(ticket_price).toFixed(2)}` : 'FREE'

  const displayCode = code || 'SAMPLE1234'
  const serialStr = serialNo != null ? String(serialNo).padStart(6, '0') : '000000'

  const [qrDataUrl, setQrDataUrl] = useState(null)
  useEffect(() => {
    if (!isHybrid) return
    let cancelled = false
    QRCode.toDataURL(serialNo != null ? String(serialNo) : 'PREVIEW', {
      width: 220,
      margin: 1,
      color: { dark: '#111111', light: '#ffffff' },
    })
      .then((url) => { if (!cancelled) setQrDataUrl(url) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [isHybrid, serialNo])

  return (
    <div className={`w-full max-w-lg mx-auto select-none ${expired ? 'grayscale opacity-60' : ''}`}>
      <div className="relative flex shadow-2xl">

        {/* ── Left: main stub ── */}
        <div
          className={`relative flex-1 min-w-0 bg-stone-100 text-gray-900 p-5 ${isHybrid ? 'rounded-l-2xl' : 'rounded-2xl'}`}
          style={{ border: `2px solid ${accent}`, borderRight: isHybrid ? 'none' : undefined }}
        >
          {used && <UsedStamp channel={usedChannel} />}

          {/* Eyebrow + logo chip */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <p className="text-[10px] font-bold tracking-[0.15em] text-gray-500 uppercase pt-1.5">
              {eventType || 'VirtualEventLive'}
            </p>
            <div
              className="w-10 h-10 rounded-lg border border-gray-300 bg-white flex items-center justify-center overflow-hidden shrink-0"
              style={!card_bg_image ? { backgroundImage: `linear-gradient(135deg, ${accent}, ${card_bg_to || accent})` } : undefined}
            >
              {card_bg_image ? (
                <img src={card_bg_image} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[9px] font-black text-white/90 leading-none text-center">LOGO</span>
              )}
            </div>
          </div>

          {/* Event name */}
          <h3 className="text-xl font-extrabold leading-tight mb-3 line-clamp-2">
            {title || 'Event Name'}
          </h3>

          {/* Viewing code */}
          <div className="mb-3">
            <p className="text-[9px] font-bold tracking-[0.15em] text-gray-500 uppercase mb-1">Viewing Code</p>
            <p className="font-mono text-base font-bold tracking-[0.2em] text-gray-900">{displayCode}</p>
            {preview && <p className="text-[10px] text-gray-500 mt-0.5">Sample — the real code appears once a ticket sells</p>}
          </div>

          {/* Venue / access line */}
          <p className="text-xs text-gray-600 mb-4">
            {isHybrid
              ? (venue_address || 'Venue address not set yet')
              : 'Virtual Event — Streamed Online'}
          </p>

          {/* Divider */}
          <div className="border-t border-dashed border-gray-300 -mx-5 mb-4" />

          {/* Price / Date / Time */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-[9px] font-bold tracking-widest text-gray-500 uppercase mb-0.5">Price</p>
              <p className="text-xs font-bold text-gray-900">{priceStr}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold tracking-widest text-gray-500 uppercase mb-0.5">Date</p>
              <p className="text-xs font-bold text-gray-900">{dateStr}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold tracking-widest text-gray-500 uppercase mb-0.5">Time</p>
              <p className="text-xs font-bold text-gray-900">{timeStr}</p>
            </div>
          </div>

          {joinHref && !expired && (
            <Link
              to={joinHref}
              className="mt-4 block text-center text-white text-xs font-extrabold tracking-wider py-2.5 rounded-xl transition-opacity hover:opacity-90"
              style={{ backgroundColor: accent }}
            >
              JOIN EVENT
            </Link>
          )}
        </div>

        {/* ── Right: QR slip — Virtual + Location only ── */}
        {isHybrid && (
          <div
            className="relative w-36 shrink-0 bg-stone-100 rounded-r-2xl border-2 border-l-0 border-dashed flex flex-col items-center justify-center gap-2 p-3 text-center"
            style={{ borderColor: accent }}
          >
            <div className="w-full aspect-square bg-white rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden p-1.5">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Check-in QR code" className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full bg-gray-100 animate-pulse rounded" />
              )}
            </div>
            <p className="text-[9px] font-black tracking-wider text-gray-900">ADMIT ONE ONLY</p>
            <div>
              <p className="text-[8px] font-bold tracking-widest text-gray-500 uppercase">Ticket No.</p>
              <p className="text-[11px] font-mono font-bold text-gray-900">{serialStr}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function UsedStamp({ channel }) {
  const label = channel === 'virtual' ? 'USED — ONLINE' : channel === 'physical' ? 'USED — AT DOOR' : 'USED'
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      <span className="border-4 border-red-600 text-red-600 font-black text-sm tracking-widest uppercase px-4 py-1.5 rounded-lg -rotate-12 bg-white/70">
        {label}
      </span>
    </div>
  )
}
