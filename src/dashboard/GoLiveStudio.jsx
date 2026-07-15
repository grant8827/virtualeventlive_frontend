import { useRef, useState, useEffect } from 'react'
import { api } from '../api/client'
import { useCompositor } from './studio/useCompositor'
import { useWhip } from './studio/useWhip'
import Ticker from './studio/Ticker'

// ─── Per-channel input card with its own mini preview ────────────────────────
function ChannelCard({ source, number, isInPvw, isInPgm, onSendToPvw, onSendToPgm }) {
  const canvasRef = useRef(null)
  const videoRef = useRef(null)
  const rafRef = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const video = document.createElement('video')
    video.srcObject = source.stream
    video.autoplay = true
    video.muted = true
    video.playsInline = true
    video.onloadeddata = () => setReady(true)
    video.play().catch(() => {})
    videoRef.current = video

    function draw() {
      const canvas = canvasRef.current
      const v = videoRef.current
      if (canvas && v && v.readyState >= 2) {
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#000'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height)
      }
      rafRef.current = requestAnimationFrame(draw)
    }
    rafRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(rafRef.current)
      video.srcObject = null
    }
  }, [source.stream])

  const borderCls = isInPgm
    ? 'border-red-600 shadow-red-900/40 shadow-lg'
    : isInPvw
    ? 'border-teal-400 shadow-teal-900/30 shadow-lg'
    : 'border-gray-700 hover:border-gray-600'

  return (
    <div
      className={`rounded-xl border-2 transition-all shrink-0 overflow-hidden flex flex-col ${borderCls}`}
      style={{ width: '190px', background: '#161616' }}
    >
      {/* Card header */}
      <div className="flex items-center justify-between px-2.5 pt-2 pb-1">
        <span className="text-[11px] text-gray-300 font-semibold truncate">
          CH {number}: {source.label}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {isInPgm && (
            <span className="bg-red-600 text-white text-[9px] px-1.5 py-px rounded font-black tracking-wide">
              PGM
            </span>
          )}
          {isInPvw && !isInPgm && (
            <span className="bg-teal-500 text-white text-[9px] px-1.5 py-px rounded font-black tracking-wide">
              PVW
            </span>
          )}
        </div>
      </div>

      {/* Preview canvas */}
      <div className="relative mx-2 rounded-lg overflow-hidden bg-black" style={{ aspectRatio: '16/9' }}>
        <canvas ref={canvasRef} width={320} height={180} className="w-full h-full block" />
        {!ready && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-700 gap-1">
            <div className="w-8 h-8 rounded-full border border-gray-700 flex items-center justify-center text-base">
              {source.type === 'camera' ? '📷' : '🖥'}
            </div>
            <p className="text-[9px] uppercase tracking-widest font-black">
              {source.type === 'camera' ? 'WEBCAM OFFLINE' : 'SCREEN SHARE'}
            </p>
            {source.type === 'camera' && (
              <p className="text-[8px] text-gray-700 text-center leading-tight">
                Click "Connect Webcam"<br />above to preview
              </p>
            )}
          </div>
        )}
      </div>

      {/* Card footer */}
      <div className="flex items-center justify-between px-2.5 py-2 mt-auto">
        <div className="flex gap-1">
          <button
            onClick={() => onSendToPvw(source.stream, source.label)}
            className={`text-[10px] px-2 py-0.5 rounded font-black transition-colors ${
              isInPvw
                ? 'bg-teal-500 text-white'
                : 'bg-gray-800 hover:bg-teal-900 text-gray-500 hover:text-teal-300'
            }`}
          >
            PRV
          </button>
          <button
            onClick={() => onSendToPgm(source.stream, source.label)}
            className={`text-[10px] px-2 py-0.5 rounded font-black transition-colors ${
              isInPgm
                ? 'bg-red-600 text-white'
                : 'bg-gray-800 hover:bg-red-900 text-gray-500 hover:text-red-300'
            }`}
          >
            PGM
          </button>
        </div>
        <span className="text-[9px] bg-gray-800 text-gray-500 px-1.5 py-px rounded uppercase tracking-wider font-black">
          {source.type}
        </span>
      </div>
    </div>
  )
}

// ─── Main studio ─────────────────────────────────────────────────────────────
export default function GoLiveStudio({ events }) {
  const pvwCanvasRef = useRef(null)
  const pgmCanvasRef = useRef(null)

  const paidEvents = events.filter((e) => e.venue_paid && !e.expired)
  const [selectedEventId, setSelectedEventId] = useState('')
  const [creds, setCreds] = useState(null)
  const [credsLoading, setCredsLoading] = useState(false)

  const [sources, setSources] = useState([])
  const [tBarValue, setTBarValue] = useState(0)
  const [fadeDuration, setFadeDuration] = useState(1000)
  const [adding, setAdding] = useState('')
  const [tickerActive, setTickerActive] = useState(false)

  const {
    pvwLabel,
    pgmLabel,
    setPvwSource,
    setPgmSource,
    cut,
    fade,
    tBarStart,
    tBarUpdate,
    tBarCommit,
    tBarCancel,
    setTicker,
    getPgmStream,
  } = useCompositor(pvwCanvasRef, pgmCanvasRef)

  const { streaming, error: whipError, start: startWhip, stop: stopWhip } = useWhip()

  useEffect(() => {
    if (paidEvents.length > 0 && !selectedEventId) {
      setSelectedEventId(paidEvents[0].id)
    }
  }, [events])

  useEffect(() => {
    if (!selectedEventId) { setCreds(null); return }
    setCredsLoading(true)
    api
      .get(`/events/${selectedEventId}/stream-credentials`)
      .then(setCreds)
      .catch(() => setCreds(null))
      .finally(() => setCredsLoading(false))
  }, [selectedEventId])

  // ─── Input actions ──────────────────────────────────────────────────────

  async function handleAddCamera() {
    setAdding('camera')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      const label = `Main Studio Cam ${sources.filter((s) => s.type === 'camera').length + 1}`
      setSources((p) => [...p, { id: crypto.randomUUID(), label, stream, type: 'camera' }])
      setPvwSource(stream, label)
    } catch (err) {
      if (err.name !== 'NotAllowedError' && err.name !== 'AbortError') {
        alert('Camera error: ' + err.message)
      }
    } finally {
      setAdding('')
    }
  }

  async function handleAddScreen() {
    setAdding('screen')
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true })
      const label = `Screen Share ${sources.filter((s) => s.type === 'screen').length + 1}`
      setSources((p) => [...p, { id: crypto.randomUUID(), label, stream, type: 'screen' }])
      setPvwSource(stream, label)
    } catch {
      // user cancelled
    } finally {
      setAdding('')
    }
  }

  // ─── T-Bar ─────────────────────────────────────────────────────────────

  function handleTBarDown() { tBarStart() }

  function handleTBarChange(e) {
    const v = Number(e.target.value)
    setTBarValue(v)
    tBarUpdate(v)
    if (v === 100) { tBarCommit(); setTBarValue(0) }
  }

  function handleTBarUp() {
    if (tBarValue > 0 && tBarValue < 100) { tBarCancel(); setTBarValue(0) }
  }

  // ─── Transitions ────────────────────────────────────────────────────────

  function handleCut() {
    if (!pvwLabel) return
    cut()
    setTBarValue(0)
  }

  function handleFade() {
    if (!pvwLabel) return
    fade(fadeDuration)
    setTBarValue(0)
  }

  // ─── Go live ────────────────────────────────────────────────────────────

  async function handleGoLive() {
    if (!creds?.ivs_ready) {
      alert('AWS IVS is not configured. Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_REGION in your .env to enable live streaming.')
      return
    }
    const pgmStream = getPgmStream()
    if (!pgmStream || pgmStream.getVideoTracks().length === 0) {
      alert('Nothing on Program. Send a source to PGM first.')
      return
    }
    await startWhip(pgmStream, creds.stream_ingest_url, creds.stream_key_value)
  }

  function handleTickerUpdate(text, active) {
    setTicker(text, active)
    setTickerActive(active)
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div
      className="rounded-2xl overflow-hidden border border-gray-800 flex flex-col"
      style={{ background: '#0a0a0a' }}
    >
      {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
      <div className="px-5 py-4 border-b border-gray-800" style={{ background: '#111' }}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-lg leading-none">📺</span>
              <h2 className="text-sm font-black text-white tracking-tight">
                Aether Production Center
                <span className="text-gray-500 font-normal ml-1.5">(vMix Studio Interface)</span>
              </h2>
            </div>
            <p className="text-[11px] text-gray-600 leading-relaxed">
              Queue up input camera sources, preview graphics, and utilize the crossfade slider to transition live feeds.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* Connect Webcam shortcut */}
            <button
              onClick={handleAddCamera}
              disabled={!!adding}
              className="flex items-center gap-1.5 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-3 py-2 rounded-xl transition-colors disabled:opacity-40 font-medium"
            >
              📷 {adding === 'camera' ? 'Connecting…' : 'Connect Webcam'}
            </button>

            {/* Overlay / ticker indicator */}
            <button
              className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border font-medium transition-colors ${
                tickerActive
                  ? 'bg-purple-700 border-purple-600 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-400'
              }`}
              onClick={() => {}} // clicking opens ticker below — visual only
            >
              {tickerActive ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-300 animate-pulse" />
                  Overlay 1 Active
                </>
              ) : (
                <>🎚 Overlay Off</>
              )}
            </button>

            {/* Event selector */}
            {paidEvents.length > 0 && (
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="text-xs bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-gray-200 focus:outline-none focus:border-purple-500 max-w-48"
              >
                {paidEvents.map((e) => (
                  <option key={e.id} value={e.id}>{e.title}</option>
                ))}
              </select>
            )}

            {/* IVS status */}
            {!credsLoading && creds && (
              <div className={`flex items-center gap-1.5 text-[11px] px-2.5 py-2 rounded-xl border font-medium ${
                creds.ivs_ready
                  ? 'bg-green-950 border-green-800 text-green-400'
                  : 'bg-gray-900 border-gray-700 text-gray-600'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${creds.ivs_ready ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
                {creds.ivs_ready ? 'IVS Ready' : 'IVS Offline'}
              </div>
            )}

            {/* Go Live / Stop */}
            {streaming ? (
              <button
                onClick={stopWhip}
                className="flex items-center gap-2 text-xs bg-red-700 hover:bg-red-600 text-white font-black px-4 py-2 rounded-xl transition-colors tracking-wide"
              >
                <span className="w-2 h-2 rounded-full bg-red-200 animate-pulse" />
                STOP STREAM
              </button>
            ) : (
              <button
                onClick={handleGoLive}
                className="flex items-center gap-2 text-xs bg-purple-600 hover:bg-purple-700 text-white font-black px-4 py-2 rounded-xl transition-colors tracking-wide"
              >
                ● GO LIVE
              </button>
            )}
          </div>
        </div>
        {whipError && <p className="mt-2 text-[11px] text-red-400">⚠ {whipError}</p>}
      </div>

      {/* ══ PVW / TRANSITIONS / PGM ══════════════════════════════════════════ */}
      <div
        className="grid gap-5 p-5"
        style={{ gridTemplateColumns: '1fr 160px 1fr' }}
      >
        {/* ── PREVIEW (PVW) ── */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-400" />
              <span className="text-[11px] font-black text-teal-400 uppercase tracking-[0.15em]">
                Preview (PVW)
              </span>
            </div>
            <span className="text-[10px] text-gray-600 font-mono">
              {pvwLabel ? `Source: ${pvwLabel.slice(0, 14)}` : ''}
            </span>
          </div>

          <div
            className="relative rounded-xl overflow-hidden bg-black"
            style={{ aspectRatio: '16/9', border: '2px solid #2dd4bf' }}
          >
            <canvas ref={pvwCanvasRef} width={1280} height={720} className="w-full h-full block" />

            {!pvwLabel && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-700">
                <div className="w-14 h-14 rounded-full border-2 border-gray-700 flex items-center justify-center">
                  <span className="text-3xl">📷</span>
                </div>
                <div className="text-center">
                  <p className="text-[11px] uppercase tracking-widest font-black text-gray-600 mb-0.5">
                    WEBCAM OFFLINE
                  </p>
                  <p className="text-[10px] text-gray-700">
                    Click "Connect Webcam" above to preview
                  </p>
                </div>
              </div>
            )}

            {pvwLabel && (
              <div className="absolute top-2 left-2 bg-teal-800/80 text-teal-200 text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-wider">
                PREVIEW SOURCE
              </div>
            )}
          </div>

          <p className="text-[10px] text-center text-gray-600 italic h-4">
            {pvwLabel ? `"${pvwLabel}" ready to transmit.` : ''}
          </p>
        </div>

        {/* ── TRANSITIONS ── */}
        <div className="flex flex-col items-center gap-3 pt-6">
          <span className="text-[10px] text-gray-500 uppercase tracking-[0.18em] font-black">
            Transitions
          </span>

          {/* CUT */}
          <button
            onClick={handleCut}
            disabled={!pvwLabel}
            className="w-full flex items-center justify-center gap-1.5 bg-gray-800 hover:bg-white hover:text-black text-white font-black py-2.5 rounded-xl transition-all disabled:opacity-25 disabled:cursor-not-allowed text-sm border border-gray-700 hover:border-transparent"
          >
            ⚡ CUT
          </button>

          {/* FADE */}
          <button
            onClick={handleFade}
            disabled={!pvwLabel}
            className="w-full flex items-center justify-center gap-1.5 text-white font-black py-2.5 rounded-xl transition-all disabled:opacity-25 disabled:cursor-not-allowed text-sm"
            style={{
              background: pvwLabel
                ? 'linear-gradient(135deg,#7c3aed 0%,#a855f7 100%)'
                : '#374151',
            }}
          >
            ↻ FADE
          </button>

          {/* Duration pills */}
          <div className="flex gap-1 w-full">
            {[
              [500, '0.5s'],
              [1000, '1s'],
              [2000, '2s'],
            ].map(([d, label]) => (
              <button
                key={d}
                onClick={() => setFadeDuration(d)}
                className={`flex-1 text-[10px] py-1 rounded-lg font-black transition-colors ${
                  fadeDuration === d
                    ? 'bg-purple-700 text-white'
                    : 'bg-gray-800 text-gray-600 hover:text-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* T-Bar */}
          <div className="flex flex-col items-center gap-1.5 w-full mt-1">
            <span className="text-[9px] text-gray-600 uppercase tracking-[0.18em] font-black">
              T-BAR switcher
            </span>
            <div className="relative flex items-center justify-center" style={{ height: '110px', width: '100%' }}>
              {/* Track */}
              <div className="absolute left-1/2 -translate-x-1/2 w-2 rounded-full bg-gray-800 inset-y-0" />
              <input
                type="range"
                min={0}
                max={100}
                value={tBarValue}
                onMouseDown={handleTBarDown}
                onTouchStart={handleTBarDown}
                onChange={handleTBarChange}
                onMouseUp={handleTBarUp}
                onTouchEnd={handleTBarUp}
                className="absolute cursor-grab active:cursor-grabbing"
                style={{
                  transform: 'rotate(-90deg)',
                  width: '110px',
                  accentColor: '#a855f7',
                }}
              />
            </div>
            <span className="text-[11px] text-gray-500 font-black font-mono tabular-nums">
              {tBarValue}% Mix
            </span>
          </div>
        </div>

        {/* ── PROGRAM (PGM) ── */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[11px] font-black text-red-400 uppercase tracking-[0.12em]">
                Program (PGM) — Live Output
              </span>
            </div>
            <span className="text-[10px] text-gray-600 font-mono">
              {pgmLabel ? `Source: ${pgmLabel.slice(0, 14)}` : ''}
            </span>
          </div>

          <div
            className="relative rounded-xl overflow-hidden bg-black"
            style={{ aspectRatio: '16/9', border: '2px solid #dc2626' }}
          >
            <canvas ref={pgmCanvasRef} width={1280} height={720} className="w-full h-full block" />

            {!pgmLabel && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-700">
                <div className="w-14 h-14 rounded-full border-2 border-gray-700 flex items-center justify-center">
                  <span className="text-3xl">📺</span>
                </div>
                <div className="text-center">
                  <p className="text-[11px] uppercase tracking-widest font-black text-gray-600 mb-0.5">
                    NO PROGRAM SOURCE
                  </p>
                  <p className="text-[10px] text-gray-700">
                    Send a source to PRV, then CUT or FADE
                  </p>
                </div>
              </div>
            )}

            {streaming && (
              <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-red-700 text-white text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-red-200 animate-pulse" />
                TRANSMITTING LIVE
              </div>
            )}

            {pgmLabel && (
              <div className="absolute bottom-2 left-2 bg-red-900/80 text-red-300 text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-wider">
                LIVE OUTPUT
              </div>
            )}
          </div>

          <p className="text-[10px] text-center text-gray-600 h-4">
            {pgmLabel ? (
              <>Active Stream: <strong className="text-gray-300">{pgmLabel}</strong></>
            ) : (
              <span className="italic text-gray-700">No active stream</span>
            )}
          </p>
        </div>
      </div>

      {/* ══ INPUT CHANNELS ══════════════════════════════════════════════════ */}
      <div className="px-5 pb-5 border-t border-gray-800/50">
        <div className="flex items-center justify-between py-3">
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.22em]">
            vMix Studio Input Channels ({sources.length})
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleAddScreen}
              disabled={!!adding}
              className="text-[11px] bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-400 hover:text-gray-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 flex items-center gap-1.5 font-medium"
            >
              🖥 {adding === 'screen' ? 'Sharing…' : 'Add Screen'}
            </button>
            <button
              onClick={handleAddCamera}
              disabled={!!adding}
              className="text-[11px] bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 flex items-center gap-1.5 font-semibold"
            >
              + Add Input Channel
            </button>
          </div>
        </div>

        {sources.length === 0 ? (
          <div className="border-2 border-dashed border-gray-800 rounded-xl py-8 text-center">
            <p className="text-gray-700 text-sm">No input channels yet.</p>
            <p className="text-gray-700 text-xs mt-1">
              Click "Add Input Channel" to connect a webcam, or "Add Screen" to share your display.
            </p>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {sources.map((src, i) => (
              <ChannelCard
                key={src.id}
                source={src}
                number={i + 1}
                isInPvw={pvwLabel === src.label}
                isInPgm={pgmLabel === src.label}
                onSendToPvw={(stream, label) => setPvwSource(stream, label)}
                onSendToPgm={(stream, label) => setPgmSource(stream, label)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ══ TICKER ══════════════════════════════════════════════════════════ */}
      <div className="px-5 py-3 border-t border-gray-800" style={{ background: '#111' }}>
        <Ticker onUpdate={handleTickerUpdate} />
      </div>
    </div>
  )
}
