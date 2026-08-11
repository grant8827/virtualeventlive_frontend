import { useEffect, useRef, useState } from 'react'
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
  logo_image,
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

  // Download/Print capture only the ticket stub itself (ticketRef) — action
  // buttons and the Join link live outside it, so they never end up baked
  // into the saved image or the printout.
  const ticketRef = useRef(null)
  const [capturing, setCapturing] = useState(false)
  const fileBase = `ticket-${(title || 'event').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${(code || serialStr)}`

  async function captureCanvas() {
    const { default: html2canvas } = await import('html2canvas')
    return html2canvas(ticketRef.current, { backgroundColor: '#f5f5f4', scale: 2, useCORS: true })
  }

  async function handleDownload() {
    if (capturing) return
    setCapturing(true)
    try {
      const canvas = await captureCanvas()
      const link = document.createElement('a')
      link.href = canvas.toDataURL('image/png')
      link.download = `${fileBase}.png`
      link.click()
    } catch {
      alert('Could not save the ticket image — please try again.')
    } finally {
      setCapturing(false)
    }
  }

  function handlePrint() {
    if (capturing) return

    // Open the window synchronously, in direct response to the click —
    // opening it only after the (async) capture finishes loses the user
    // gesture and gets silently popup-blocked in Safari/Chrome.
    const win = window.open('', '_blank', 'width=680,height=880')
    if (!win) {
      alert('Please allow pop-ups to print your ticket.')
      return
    }
    win.document.write(`<!doctype html><html><head><title>${fileBase}</title>
      <style>
        html,body{margin:0;padding:24px;background:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;color:#888}
        img{max-width:100%;height:auto}
        @media print{ html,body{padding:0} }
      </style></head>
      <body><p>Preparing your ticket…</p></body></html>`)
    win.document.close()

    setCapturing(true)
    captureCanvas()
      .then((canvas) => {
        const dataUrl = canvas.toDataURL('image/png')
        win.document.body.innerHTML = `<img src="${dataUrl}" alt="Ticket" />`
        const img = win.document.querySelector('img')
        img.onload = () => { win.focus(); win.print() }
      })
      .catch(() => {
        win.close()
        alert('Could not prepare the ticket for printing — please try again.')
      })
      .finally(() => setCapturing(false))
  }

  return (
    <div className={`w-full max-w-lg mx-auto select-none ${expired ? 'grayscale opacity-60' : ''}`}>
      <div ref={ticketRef} className="relative flex shadow-2xl">

        {/* ── Left: main stub ── */}
        <div
          className={`relative flex-1 min-w-0 bg-stone-100 text-gray-900 p-5 ${isHybrid ? 'rounded-l-2xl' : 'rounded-2xl'}`}
          style={{ border: `2px solid ${accent}`, borderRight: isHybrid ? 'none' : undefined }}
        >
          {used && <UsedStamp channel={usedChannel} />}

          {/* Eyebrow + host logo — the logo chip only renders when the host has uploaded one */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <p className="text-[10px] font-bold tracking-[0.15em] text-gray-500 uppercase pt-1.5">
              {eventType || 'VirtualEventLive'}
            </p>
            {logo_image && (
              <div className="w-10 h-10 rounded-lg border border-gray-300 bg-white flex items-center justify-center overflow-hidden shrink-0">
                <img src={logo_image} alt="" className="w-full h-full object-contain" />
              </div>
            )}
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

      {/* ── Actions — outside the captured ticket, so they never end up in the saved image/printout ── */}
      {(joinHref || !preview) && (
        <div className="flex flex-wrap gap-2 mt-3">
          {joinHref && !expired && (
            <Link
              to={joinHref}
              className="flex-1 min-w-32 text-center text-white text-xs font-extrabold tracking-wider py-2.5 rounded-xl transition-opacity hover:opacity-90"
              style={{ backgroundColor: accent }}
            >
              JOIN EVENT
            </Link>
          )}
          {!preview && (
            <>
              <button
                type="button"
                onClick={handleDownload}
                disabled={capturing}
                className="flex-1 min-w-32 flex items-center justify-center gap-1.5 text-xs font-bold tracking-wide py-2.5 rounded-xl border border-gray-700 bg-gray-900 text-gray-200 hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 10.5L12 15m0 0l4.5-4.5M12 15V3" />
                </svg>
                {capturing ? 'Preparing…' : 'Download'}
              </button>
              <button
                type="button"
                onClick={handlePrint}
                disabled={capturing}
                className="flex-1 min-w-32 flex items-center justify-center gap-1.5 text-xs font-bold tracking-wide py-2.5 rounded-xl border border-gray-700 bg-gray-900 text-gray-200 hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.055 48.055 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
                </svg>
                {capturing ? 'Preparing…' : 'Print'}
              </button>
            </>
          )}
        </div>
      )}
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
