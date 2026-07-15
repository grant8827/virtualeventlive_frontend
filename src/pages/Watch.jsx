import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import Hls from 'hls.js'
import ChatPanel from '../components/ChatPanel'

export default function Watch() {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const codeFromUrl = searchParams.get('code') || ''

  const videoRef = useRef(null)
  const hlsRef = useRef(null)

  const [codeInput, setCodeInput] = useState(codeFromUrl)
  const [title, setTitle] = useState('')
  const [playbackUrl, setPlaybackUrl] = useState(null)
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function verify(code) {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/v1/tickets/enter?code=${encodeURIComponent(code)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ticket not found')
      if (data.event_id !== id) throw new Error('This ticket is not valid for this event.')
      setTitle(data.event_title)
      setPlaybackUrl(data.playback_url || null)
      setAuthorized(true)
    } catch (err) {
      setAuthorized(false)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (codeFromUrl) verify(codeFromUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeFromUrl, id])

  useEffect(() => {
    const video = videoRef.current
    if (!playbackUrl || !video) return

    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    if (Hls.isSupported()) {
      const hls = new Hls({ lowLatencyMode: true })
      hlsRef.current = hls
      hls.loadSource(playbackUrl)
      hls.attachMedia(video)
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = playbackUrl
    } else {
      setError('Your browser does not support HLS playback.')
    }

    return () => {
      hlsRef.current?.destroy()
      hlsRef.current = null
    }
  }, [playbackUrl])

  function handleSubmitCode(e) {
    e.preventDefault()
    const trimmed = codeInput.trim()
    if (!trimmed) return
    setSearchParams({ code: trimmed }, { replace: true })
    verify(trimmed)
  }

  if (!authorized) {
    return (
      <div className="max-w-md mx-auto px-6 py-16">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          <h1 className="text-xl font-bold mb-1">Enter Your Ticket Code</h1>
          <p className="text-gray-400 text-sm mb-6">A valid ticket is required to watch this event.</p>

          <form onSubmit={handleSubmitCode} className="space-y-4">
            <input
              autoFocus
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder="e.g. TCK-8f3a2b1c…"
              className="w-full bg-gray-800 border border-gray-700 focus:border-purple-500 rounded-xl px-4 py-3 text-white placeholder-gray-600 font-mono text-sm focus:outline-none transition-colors"
            />

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading || !codeInput.trim()}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {loading ? 'Verifying…' : 'Join Event'}
            </button>
          </form>

          <p className="text-gray-600 text-xs text-center mt-5">
            Don't have a ticket?{' '}
            <Link to="/tickets" className="text-purple-400 hover:text-purple-300 transition-colors">
              Browse events
            </Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-4">

        {/* ── Left: player ── */}
        <div className="flex-1 min-w-0">
          <div className="mb-4 flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <h1 className="text-xl font-semibold">{title}</h1>
          </div>

          {playbackUrl ? (
            <div className="aspect-video bg-black rounded-2xl overflow-hidden">
              <video
                ref={videoRef}
                controls
                autoPlay
                playsInline
                className="w-full h-full"
              />
            </div>
          ) : (
            <div className="aspect-video bg-gray-900 border border-gray-800 rounded-2xl flex flex-col items-center justify-center gap-3 text-center px-6">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-600 animate-pulse" />
              <p className="text-gray-400">Waiting for the host to go live…</p>
              <button
                onClick={() => verify(codeFromUrl)}
                className="text-purple-400 hover:text-purple-300 text-sm transition-colors"
              >
                Refresh
              </button>
            </div>
          )}

          <Link to={`/events/${id}`} className="text-gray-500 hover:text-gray-300 text-sm mt-4 block">
            ← Event details
          </Link>
        </div>

        {/* ── Right: live chat ── */}
        <div className="w-full md:w-80 shrink-0 h-96 md:h-150">
          <ChatPanel eventId={id} />
        </div>

      </div>
    </div>
  )
}
