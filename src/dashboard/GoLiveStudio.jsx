import { useRef, useState, useEffect } from 'react'
import { api } from '../api/client'
import { useCompositor } from './studio/useCompositor'
import { useWhip } from './studio/useWhip'
import Ticker from './studio/Ticker'
import StudioSettingsModal from './studio/StudioSettingsModal'
import AddChannelModal from './studio/AddChannelModal'
import { saveImage, getImage, getObjectURL, deleteImage, studioLogoKey, studioChannelImageKey } from '../lib/imageStore'

const STUDIO_CHANNELS_KEY = 'studio-channels'

const SOURCE_ICONS = { camera: '📷', screen: '🖥', image: '🖼', audio: '🎤' }
const SOURCE_OFFLINE_LABELS = { camera: 'WEBCAM OFFLINE', screen: 'SCREEN SHARE', image: 'LOADING IMAGE…', audio: 'AUDIO ONLY' }

// ─── Live input-level meter, driven by a real AnalyserNode (no simulated data) ──
function AudioLevelMeter({ stream }) {
  const [level, setLevel] = useState(0)

  useEffect(() => {
    if (!stream || stream.getAudioTracks().length === 0) return

    const audioCtx = new AudioContext()
    const sourceNode = audioCtx.createMediaStreamSource(stream)
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 256
    sourceNode.connect(analyser)
    const data = new Uint8Array(analyser.frequencyBinCount)

    let rafId
    function poll() {
      analyser.getByteTimeDomainData(data)
      let peak = 0
      for (const v of data) {
        const dev = Math.abs(v - 128)
        if (dev > peak) peak = dev
      }
      setLevel(Math.min(100, Math.round((peak / 128) * 100)))
      rafId = requestAnimationFrame(poll)
    }
    poll()

    return () => {
      cancelAnimationFrame(rafId)
      sourceNode.disconnect()
      audioCtx.close().catch(() => {})
    }
  }, [stream])

  const color = level > 85 ? '#dc2626' : level > 65 ? '#eab308' : '#22c55e'

  return (
    <div className="w-3/4 h-1.5 rounded-full bg-gray-800 overflow-hidden mt-1">
      <div className="h-full transition-all" style={{ width: `${level}%`, background: color }} />
    </div>
  )
}

// ─── Per-channel input card with its own mini preview ────────────────────────
function ChannelCard({ source, number, isInPvw, isInPgm, onSendToPvw, onSendToPgm, onSwitchAudioDevice, onRemove }) {
  const canvasRef = useRef(null)
  const videoRef = useRef(null)
  const rafRef = useRef(null)
  const [ready, setReady] = useState(false)
  const hasVideo = source.stream.getVideoTracks().length > 0

  const [showDeviceMenu, setShowDeviceMenu] = useState(false)
  const [devices, setDevices] = useState([])
  const deviceMenuRef = useRef(null)

  useEffect(() => {
    if (!showDeviceMenu) return
    navigator.mediaDevices.enumerateDevices().then((list) => {
      setDevices(list.filter((d) => d.kind === 'audioinput'))
    })
  }, [showDeviceMenu])

  useEffect(() => {
    if (!showDeviceMenu) return
    function handleClickOutside(e) {
      if (deviceMenuRef.current && !deviceMenuRef.current.contains(e.target)) {
        setShowDeviceMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showDeviceMenu])

  useEffect(() => {
    if (!hasVideo) return // audio-only source — nothing to draw, placeholder covers it

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
  }, [source.stream, hasVideo])

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
          <button
            onClick={() => onRemove(source.id)}
            title="Remove channel"
            className="w-4 h-4 rounded-full bg-gray-800 hover:bg-red-600 text-gray-400 hover:text-white flex items-center justify-center text-[9px] leading-none transition-colors shrink-0"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Preview canvas */}
      <div className="relative mx-2 rounded-lg overflow-hidden bg-black" style={{ aspectRatio: '16/9' }}>
        {hasVideo && <canvas ref={canvasRef} width={320} height={180} className="w-full h-full block" />}
        {(!hasVideo || !ready) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-700 gap-1 px-2">
            <div className="w-8 h-8 rounded-full border border-gray-700 flex items-center justify-center text-base">
              {SOURCE_ICONS[source.type] || '🖥'}
            </div>
            <p className="text-[9px] uppercase tracking-widest font-black">
              {SOURCE_OFFLINE_LABELS[source.type] || 'SCREEN SHARE'}
            </p>
            {source.type === 'camera' && (
              <p className="text-[8px] text-gray-700 text-center leading-tight">
                Waiting for camera<br />signal…
              </p>
            )}
            {source.type === 'audio' && <AudioLevelMeter stream={source.stream} />}
          </div>
        )}
      </div>

      {/* Card footer */}
      <div className="flex items-center justify-between px-2.5 py-2 mt-auto">
        {source.type === 'audio' ? (
          <>
            <span className="text-[9px] text-purple-400 font-black uppercase tracking-wider">
              🔊 Main Audio Source
            </span>
            <div className="relative" ref={deviceMenuRef}>
              <button
                onClick={() => setShowDeviceMenu((v) => !v)}
                title="Select audio input"
                className="text-gray-500 hover:text-gray-300 transition-colors px-1 text-sm"
              >
                ⚙
              </button>
              {showDeviceMenu && (
                <div className="absolute bottom-full right-0 mb-1 z-20 bg-gray-900 border border-gray-700 rounded-lg p-1 w-40 shadow-xl max-h-40 overflow-y-auto">
                  {devices.length === 0 ? (
                    <p className="text-[10px] text-gray-600 px-2 py-1.5">No inputs found</p>
                  ) : (
                    devices.map((d, i) => (
                      <button
                        key={d.deviceId || i}
                        onClick={() => { setShowDeviceMenu(false); onSwitchAudioDevice(source.id, d.deviceId) }}
                        className="w-full text-left text-[10px] text-gray-300 hover:bg-gray-800 hover:text-white px-2 py-1.5 rounded truncate"
                      >
                        {d.label || `Microphone ${i + 1}`}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
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
          </>
        )}
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
  const restoredChannelsRef = useRef(false)

  // Restore camera/audio/image channels from a previous session on mount.
  // Screen shares are deliberately skipped — browsers never allow silently
  // re-triggering screen capture after a reload, a fresh user gesture and
  // picker interaction is required every single time, no way around it.
  //
  // Cancellation matters here, not just as cleanup hygiene: React StrictMode
  // deliberately mounts every effect twice in development specifically to
  // catch ones missing this guard. Without it, this async restore ran to
  // completion twice, each call adding every saved channel — exactly the
  // "2 of each" duplication this was fixed for.
  useEffect(() => {
    let cancelled = false

    async function restore() {
      const raw = localStorage.getItem(STUDIO_CHANNELS_KEY)
      if (!raw) return
      let saved
      try {
        saved = JSON.parse(raw)
      } catch {
        return
      }

      for (const entry of saved) {
        if (cancelled) return
        try {
          if (entry.type === 'camera') {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: entry.deviceId ? { deviceId: { exact: entry.deviceId } } : true,
              audio: false,
            })
            if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return }
            setSources((p) => [...p, { id: entry.id, label: entry.label, stream, type: 'camera', deviceId: entry.deviceId }])
          } else if (entry.type === 'audio') {
            const stream = await navigator.mediaDevices.getUserMedia({
              audio: entry.deviceId ? { deviceId: { exact: entry.deviceId } } : true,
              video: false,
            })
            if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return }
            setSources((p) => [...p, { id: entry.id, label: entry.label, stream, type: 'audio', deviceId: entry.deviceId }])
          } else if (entry.type === 'image') {
            const blob = await getImage(studioChannelImageKey(entry.id))
            if (!blob) continue
            const img = await loadImageFile(blob)
            if (cancelled) return
            const stream = makeImageChannelStream(img)
            setSources((p) => [...p, { id: entry.id, label: entry.label, stream, type: 'image' }])
          }
        } catch {
          // device gone, permission revoked, blob missing — just skip that one channel
        }
      }
    }
    restore().finally(() => {
      if (!cancelled) restoredChannelsRef.current = true
    })

    return () => {
      cancelled = true
    }
  }, [])

  // Persist the channel list (not the media itself) so it can be rebuilt on
  // the next load. Skipped until restoration above has settled — otherwise
  // the initial empty `sources` would immediately overwrite the saved list
  // before restoration ever gets a chance to read it.
  useEffect(() => {
    if (!restoredChannelsRef.current) return
    const persistable = sources
      .filter((s) => s.type !== 'screen')
      .map((s) => ({ id: s.id, label: s.label, type: s.type, deviceId: s.deviceId || null }))
    localStorage.setItem(STUDIO_CHANNELS_KEY, JSON.stringify(persistable))
  }, [sources])

  const [tBarValue, setTBarValue] = useState(0)
  const [fadeDuration, setFadeDuration] = useState(1000)
  const [adding, setAdding] = useState('')
  const [tickerActive, setTickerActive] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)

  // Studio settings modal — logo/watermark is the first tab. The image blob
  // lives in IndexedDB (same store used elsewhere for ticket/ad images);
  // enabled/position are small enough for localStorage. Together that means
  // the watermark survives a page reload instead of vanishing with it.
  const [showSettings, setShowSettings] = useState(false)
  const [settingsTab, setSettingsTab] = useState('logo')
  const [logoEnabled, setLogoEnabled] = useState(() => localStorage.getItem('studio-logo-enabled') === '1')
  const [logoPosition, setLogoPosition] = useState(() => localStorage.getItem('studio-logo-position') || 'bottom-right')
  const [logoPreviewUrl, setLogoPreviewUrl] = useState('')
  const logoPreviewUrlRef = useRef('')

  useEffect(() => {
    localStorage.setItem('studio-logo-enabled', logoEnabled ? '1' : '0')
  }, [logoEnabled])

  useEffect(() => {
    localStorage.setItem('studio-logo-position', logoPosition)
  }, [logoPosition])

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
    setLogo,
    getPgmStream,
  } = useCompositor(pvwCanvasRef, pgmCanvasRef)

  // Keep the compositor's enabled/position in sync with the settings modal
  useEffect(() => {
    setLogo({ enabled: logoEnabled, position: logoPosition })
  }, [logoEnabled, logoPosition, setLogo])

  // Restore a previously-uploaded logo from IndexedDB on mount, so it
  // survives a page reload instead of only living in this session's memory.
  useEffect(() => {
    let cancelled = false
    getObjectURL(studioLogoKey()).then((url) => {
      if (cancelled || !url) return
      const img = new Image()
      img.onload = () => {
        if (!cancelled) setLogo({ image: img })
      }
      img.src = url
      logoPreviewUrlRef.current = url
      setLogoPreviewUrl(url)
    })
    return () => {
      cancelled = true
    }
  }, [setLogo])

  async function handleUploadLogo(file) {
    if (!file) return
    await saveImage(studioLogoKey(), file)
    const url = await getObjectURL(studioLogoKey())
    if (!url) return

    const img = new Image()
    img.onload = () => {
      setLogo({ image: img })
      setLogoEnabled(true)
    }
    img.src = url

    if (logoPreviewUrlRef.current) URL.revokeObjectURL(logoPreviewUrlRef.current)
    logoPreviewUrlRef.current = url
    setLogoPreviewUrl(url)
  }

  async function handleRemoveLogo() {
    setLogo({ enabled: false, image: null })
    setLogoEnabled(false)
    if (logoPreviewUrlRef.current) URL.revokeObjectURL(logoPreviewUrlRef.current)
    logoPreviewUrlRef.current = ''
    setLogoPreviewUrl('')
    await deleteImage(studioLogoKey())
  }

  const { streaming, error: whipError, start: startWhip, stop: stopWhip, replaceAudioTrack } = useWhip()

  // The Audio channel (if one exists) is always the broadcast's live audio —
  // it isn't part of the PVW/PGM switcher, so this just watches for it being
  // added or having its input device swapped while already streaming.
  useEffect(() => {
    if (!streaming) return
    const audioSource = sources.find((s) => s.type === 'audio')
    replaceAudioTrack(audioSource ? audioSource.stream.getAudioTracks()[0] : null)
  }, [sources, streaming])

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

  async function handleAddCamera(customLabel, deviceId) {
    setAdding('camera')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: deviceId ? { deviceId: { exact: deviceId } } : true,
        audio: false,
      })
      const label = customLabel?.trim() || `Main Studio Cam ${sources.filter((s) => s.type === 'camera').length + 1}`
      setSources((p) => [...p, { id: crypto.randomUUID(), label, stream, type: 'camera', deviceId: deviceId || null }])
      setPvwSource(stream, label)
    } catch (err) {
      if (err.name !== 'NotAllowedError' && err.name !== 'AbortError') {
        alert('Camera error: ' + err.message)
      }
    } finally {
      setAdding('')
    }
  }

  // The stream is already captured (and previewed) inside AddChannelModal —
  // this just commits it as a channel, no second getDisplayMedia prompt.
  // Note: screen shares are deliberately excluded from restore-on-reload
  // (see the persist effect below) — browsers never allow silently
  // re-triggering screen capture, a fresh user gesture is required every time.
  function handleAddScreen(customLabel, stream) {
    if (!stream) return
    const label = customLabel?.trim() || `Screen Share ${sources.filter((s) => s.type === 'screen').length + 1}`
    setSources((p) => [...p, { id: crypto.randomUUID(), label, stream, type: 'screen' }])
    setPvwSource(stream, label)
  }

  // Loads a file or Blob into an <img>, decoded and ready to draw — the
  // object URL is safe to revoke right after onload since the pixel data is
  // already decoded into the image element by that point. Used both when
  // adding an image channel (from a File) and when restoring one from
  // IndexedDB on mount (from the Blob saved there).
  function loadImageFile(fileOrBlob) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(fileOrBlob)
      const img = new Image()
      img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not load image')) }
      img.src = url
    })
  }

  // Draws a loaded image once onto an offscreen canvas and captures that as
  // a (near-static) MediaStream — this is what lets a static image slot into
  // the exact same PVW/PGM/ticker pipeline as a camera or screen share.
  function makeImageChannelStream(img) {
    const canvas = document.createElement('canvas')
    canvas.width = 1280
    canvas.height = 720
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    const scale = Math.min(canvas.width / img.width, canvas.height / img.height)
    const w = img.width * scale
    const h = img.height * scale
    ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h)
    return canvas.captureStream(1)
  }

  async function handleAddImage(file, customLabel) {
    if (!file) return
    setAdding('image')
    try {
      const img = await loadImageFile(file)
      const stream = makeImageChannelStream(img)
      const label = customLabel?.trim() || `Image ${sources.filter((s) => s.type === 'image').length + 1}`
      const id = crypto.randomUUID()
      await saveImage(studioChannelImageKey(id), file)
      setSources((p) => [...p, { id, label, stream, type: 'image' }])
      setPvwSource(stream, label)
    } catch (err) {
      alert('Image error: ' + err.message)
    } finally {
      setAdding('')
    }
  }

  // Audio is capped at one channel — it isn't part of the PVW/PGM switcher at
  // all, it's a standalone mic input that's always the broadcast's live audio
  // (see the sources-watching effect below), so there's never a second one to mix.
  async function handleAddAudio(customLabel, deviceId) {
    if (sources.some((s) => s.type === 'audio')) return
    setAdding('audio')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
        video: false,
      })
      const label = customLabel?.trim() || 'Main Audio Source'
      setSources((p) => [...p, { id: crypto.randomUUID(), label, stream, type: 'audio', deviceId: deviceId || null }])
    } catch (err) {
      if (err.name !== 'NotAllowedError' && err.name !== 'AbortError') {
        alert('Microphone error: ' + err.message)
      }
    } finally {
      setAdding('')
    }
  }

  // Swaps the audio channel's input device — the sources-watching effect
  // below picks up the new stream automatically and hot-swaps it into the
  // live broadcast if already streaming.
  async function handleSwitchAudioDevice(id, deviceId) {
    const target = sources.find((s) => s.id === id)
    if (!target) return
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: deviceId } },
        video: false,
      })
      target.stream.getTracks().forEach((t) => t.stop())
      setSources((prev) => prev.map((s) => (s.id === id ? { ...s, stream: newStream } : s)))
    } catch (err) {
      alert('Could not switch microphone: ' + err.message)
    }
  }

  // Releases the underlying device/capture (camera, mic, screen, or the
  // image's canvas track) and clears whichever bus it was occupying, same as
  // unplugging a physical source.
  function handleRemoveChannel(id) {
    const target = sources.find((s) => s.id === id)
    if (!target) return

    target.stream.getTracks().forEach((t) => t.stop())
    if (target.type === 'image') {
      deleteImage(studioChannelImageKey(id)).catch(() => {})
    }

    if (pvwLabel === target.label) setPvwSource(null, '')
    if (pgmLabel === target.label) setPgmSource(null, '')

    setSources((prev) => prev.filter((s) => s.id !== id))
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
    const audioSource = sources.find((s) => s.type === 'audio')
    await startWhip(
      pgmStream,
      creds.stream_ingest_url,
      creds.stream_key_value,
      audioSource ? audioSource.stream.getAudioTracks()[0] : null
    )
  }

  function handleTickerUpdate(patch) {
    setTicker(patch)
    if ('active' in patch) setTickerActive(patch.active)
  }

  const hasAudioSource = sources.some((s) => s.type === 'audio')

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
                Virtual Event Live Production Center
                <span className="text-gray-500 font-normal ml-1.5">(Studio Interface)</span>
              </h2>
            </div>
            <p className="text-[11px] text-gray-600 leading-relaxed">
              Queue up input camera sources, preview graphics, and utilize the crossfade slider to transition live feeds.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
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
                    NO PREVIEW SOURCE
                  </p>
                  <p className="text-[10px] text-gray-700">
                    Use "+ Add Input Channel" below to get started
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
          <div className="flex flex-col items-center gap-2 w-full mt-1">
            <span className="text-[9px] text-gray-600 uppercase tracking-[0.18em] font-black mt-2 mb-1">
              T-BAR switcher
            </span>
            <div className="flex items-center gap-2 w-full mt-2 mb-2">
              <span className="text-[9px] text-teal-400 font-black shrink-0">PVW</span>
              <input
                type="range"
                min={0}
                max={100}
                value={tBarValue}
                disabled={!pvwLabel}
                onMouseDown={handleTBarDown}
                onTouchStart={handleTBarDown}
                onChange={handleTBarChange}
                onMouseUp={handleTBarUp}
                onTouchEnd={handleTBarUp}
                className="t-bar-slider flex-1 disabled:opacity-30 disabled:cursor-not-allowed"
              />
              <span className="text-[9px] text-red-400 font-black shrink-0">PGM</span>
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

      {/* ══ TICKER ══════════════════════════════════════════════════════════ */}
      <div className="px-5 py-3 border-t border-gray-800" style={{ background: '#111' }}>
        <Ticker onUpdate={handleTickerUpdate} />
      </div>

      {/* ══ INPUT CHANNELS ══════════════════════════════════════════════════ */}
      <div className="px-5 pb-5 border-t border-gray-800/50">
        <div className="flex items-center justify-between py-3">
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.22em]">
            Studio Input Channels ({sources.length})
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              disabled={!!adding}
              className="text-[11px] bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 flex items-center gap-1.5 font-semibold"
            >
              {adding ? `Adding ${adding}…` : '+ Add Input Channel'}
            </button>

            <button
              onClick={() => setShowSettings(true)}
              title="Studio settings"
              className="text-gray-500 hover:text-gray-300 border border-gray-700 hover:border-gray-600 rounded-lg w-8 h-8 flex items-center justify-center transition-colors shrink-0"
            >
              ⚙
            </button>
          </div>
        </div>

        {sources.length === 0 ? (
          <div className="border-2 border-dashed border-gray-800 rounded-xl py-8 text-center">
            <p className="text-gray-700 text-sm">No input channels yet.</p>
            <p className="text-gray-700 text-xs mt-1">
              Click "+ Add Input Channel" to connect a camera, screen share, image, or audio-only source.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3 pb-1">
            {sources.map((src, i) => (
              <ChannelCard
                key={src.id}
                source={src}
                number={i + 1}
                isInPvw={pvwLabel === src.label}
                isInPgm={pgmLabel === src.label}
                onSendToPvw={(stream, label) => setPvwSource(stream, label)}
                onSendToPgm={(stream, label) => setPgmSource(stream, label)}
                onSwitchAudioDevice={handleSwitchAudioDevice}
                onRemove={handleRemoveChannel}
              />
            ))}
          </div>
        )}
      </div>

      {showAddModal && (
        <AddChannelModal
          hasAudioSource={hasAudioSource}
          adding={adding}
          onAddCamera={handleAddCamera}
          onAddScreen={handleAddScreen}
          onAddImage={handleAddImage}
          onAddAudio={handleAddAudio}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {showSettings && (
        <StudioSettingsModal
          activeTab={settingsTab}
          onTabChange={setSettingsTab}
          onClose={() => setShowSettings(false)}
          logoEnabled={logoEnabled}
          logoPosition={logoPosition}
          logoPreviewUrl={logoPreviewUrl}
          onToggleLogo={() => setLogoEnabled((v) => !v)}
          onChangeLogoPosition={setLogoPosition}
          onUploadLogo={handleUploadLogo}
          onRemoveLogo={handleRemoveLogo}
        />
      )}
    </div>
  )
}
