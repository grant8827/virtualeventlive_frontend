import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { api } from '../../api/client'

// Door check-in for "Virtual + Location" tickets: scans a ticket's QR code
// via the device camera, or accepts its printed serial number typed in by
// hand when the QR can't be read. Both resolve to the same backend lookup —
// see TicketHandler.CheckIn — so either path enforces the same one-use-only
// rule against the ticket's virtual (livestream) entry.
export default function ScanTicketsPage() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(null)
  const busyRef = useRef(false)

  const [cameraState, setCameraState] = useState('idle') // idle | starting | live | denied | unsupported
  const [manualCode, setManualCode] = useState('')
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState(null) // { ok, message, detail }

  useEffect(() => {
    startCamera()
    return stopCamera
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState('unsupported')
      return
    }
    setCameraState('starting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraState('live')
      rafRef.current = requestAnimationFrame(scanFrame)
    } catch {
      setCameraState('denied')
    }
  }

  function stopCamera() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  function scanFrame() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA && !busyRef.current) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const frame = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(frame.data, frame.width, frame.height)
      if (code?.data) {
        submitCode(code.data, 'camera')
      }
    }
    rafRef.current = requestAnimationFrame(scanFrame)
  }

  async function submitCode(code, source) {
    if (busyRef.current || !code) return
    busyRef.current = true
    setChecking(true)
    setResult(null)
    try {
      const data = await api.post('/tickets/checkin', { code })
      setResult({ ok: true, message: `✓ Admitted — ${data.event_title}`, detail: `Ticket #${String(data.serial_no).padStart(6, '0')}` })
    } catch (err) {
      setResult({ ok: false, message: err.message || 'Check-in failed' })
    } finally {
      setChecking(false)
      if (source === 'manual') setManualCode('')
      // Debounce so the same QR isn't re-submitted on every animation frame
      // while it's still sitting in front of the camera.
      setTimeout(() => { busyRef.current = false }, 2500)
    }
  }

  function handleManualSubmit(e) {
    e.preventDefault()
    const trimmed = manualCode.trim()
    if (!trimmed) return
    submitCode(trimmed, 'manual')
  }

  return (
    <div className="max-w-xl mx-auto">
      <h2 className="text-lg font-semibold mb-2">Scan Tickets</h2>
      <p className="text-gray-400 text-sm mb-6 leading-relaxed">
        Scan a "Virtual + Location" ticket's QR code to check a guest in at the door. If the QR
        won't scan, type the ticket number printed under it instead.
      </p>

      {/* Camera */}
      <div className="relative bg-black rounded-2xl overflow-hidden border border-gray-800 aspect-square max-w-sm mx-auto mb-3">
        <video ref={videoRef} muted playsInline className="w-full h-full object-cover" />
        <canvas ref={canvasRef} className="hidden" />

        {cameraState === 'live' && (
          <div className="absolute inset-8 border-2 border-purple-500/70 rounded-2xl pointer-events-none" />
        )}

        {cameraState !== 'live' && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-950/90 px-6 text-center">
            {cameraState === 'starting' && <p className="text-gray-400 text-sm">Starting camera…</p>}
            {cameraState === 'denied' && (
              <p className="text-gray-400 text-sm">
                Camera access denied or unavailable. Allow camera permission and reload, or use the
                manual entry below.
              </p>
            )}
            {cameraState === 'unsupported' && (
              <p className="text-gray-400 text-sm">This browser doesn't support camera scanning here — use manual entry below.</p>
            )}
          </div>
        )}

        {checking && (
          <div className="absolute inset-x-0 bottom-0 bg-purple-600/90 text-white text-xs font-semibold text-center py-1.5">
            Checking…
          </div>
        )}
      </div>

      {(cameraState === 'denied' || cameraState === 'unsupported') && (
        <button
          onClick={startCamera}
          className="block mx-auto text-xs text-purple-400 hover:text-purple-300 mb-6"
        >
          Try camera again
        </button>
      )}

      {/* Result banner */}
      {result && (
        <div className={`rounded-xl px-4 py-3 mb-6 text-sm ${result.ok ? 'bg-green-950 border border-green-800 text-green-300' : 'bg-red-950 border border-red-800 text-red-300'}`}>
          <p className="font-semibold">{result.message}</p>
          {result.detail && <p className="text-xs opacity-80 mt-0.5">{result.detail}</p>}
        </div>
      )}

      {/* Manual fallback */}
      <form onSubmit={handleManualSubmit} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <label className="block text-sm text-gray-400 mb-1.5">Ticket Number (manual entry)</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="e.g. 000123"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 font-mono focus:outline-none focus:border-purple-500 transition-colors"
          />
          <button
            type="submit"
            disabled={checking || !manualCode.trim()}
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl font-semibold transition-colors whitespace-nowrap"
          >
            Check In
          </button>
        </div>
        <p className="text-xs text-gray-600 mt-2">The number printed under the QR code on the ticket's right-hand stub.</p>
      </form>
    </div>
  )
}
