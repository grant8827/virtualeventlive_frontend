import { useRef, useEffect } from 'react'

export default function InputCard({ source, isInPvw, isInPgm, onSendToPvw, onSendToPgm }) {
  const canvasRef = useRef(null)
  const videoRef = useRef(null)
  const rafRef = useRef(null)

  useEffect(() => {
    const video = document.createElement('video')
    video.srcObject = source.stream
    video.autoplay = true
    video.muted = true
    video.playsInline = true
    video.play().catch(() => {})
    videoRef.current = video

    function draw() {
      const canvas = canvasRef.current
      const v = videoRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#000'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        if (v && v.readyState >= 2) {
          ctx.drawImage(v, 0, 0, canvas.width, canvas.height)
        }
      }
      rafRef.current = requestAnimationFrame(draw)
    }
    rafRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(rafRef.current)
      video.srcObject = null
      videoRef.current = null
    }
  }, [source.stream])

  const borderCls = isInPgm
    ? 'border-red-500 shadow-lg shadow-red-900/40'
    : isInPvw
    ? 'border-yellow-400 shadow-lg shadow-yellow-900/30'
    : 'border-gray-700 hover:border-gray-500'

  return (
    <div
      className={`rounded-xl overflow-hidden border-2 transition-all shrink-0 w-44 bg-gray-900 ${borderCls}`}
    >
      <div className="relative aspect-video bg-black">
        <canvas
          ref={canvasRef}
          width={320}
          height={180}
          className="w-full h-full block"
        />
        {isInPgm && (
          <span className="absolute top-1 left-1 flex items-center gap-1 bg-red-900/90 text-red-300 text-[10px] px-1.5 py-0.5 rounded font-black tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            PGM
          </span>
        )}
        {isInPvw && !isInPgm && (
          <span className="absolute top-1 left-1 bg-yellow-900/90 text-yellow-300 text-[10px] px-1.5 py-0.5 rounded font-black tracking-wider">
            PRV
          </span>
        )}
      </div>
      <div className="px-2 pt-1.5 pb-2">
        <p className="text-[11px] text-gray-300 truncate font-medium mb-1.5">{source.label}</p>
        <div className="flex gap-1">
          <button
            onClick={() => onSendToPvw(source.stream, source.label)}
            title="Send to Preview"
            className={`flex-1 text-[11px] py-1 rounded font-bold tracking-wide transition-colors ${
              isInPvw
                ? 'bg-yellow-500 text-black'
                : 'bg-gray-800 hover:bg-yellow-900 text-gray-400 hover:text-yellow-300'
            }`}
          >
            PRV
          </button>
          <button
            onClick={() => onSendToPgm(source.stream, source.label)}
            title="Send directly to Program"
            className={`flex-1 text-[11px] py-1 rounded font-bold tracking-wide transition-colors ${
              isInPgm
                ? 'bg-red-600 text-white'
                : 'bg-gray-800 hover:bg-red-900 text-gray-400 hover:text-red-300'
            }`}
          >
            PGM
          </button>
        </div>
      </div>
    </div>
  )
}
