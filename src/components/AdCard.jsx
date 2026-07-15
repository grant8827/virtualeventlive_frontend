import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getObjectURL, adImgKey } from '../lib/imageStore'

export default function AdCard({ headline, body, image_url, cta_text, event_id }) {
  const to = event_id ? `/events/${event_id}` : null
  const [localImage, setLocalImage] = useState(null)
  const [open, setOpen] = useState(false)

  // Flyer images live in this browser's IndexedDB — fall back to it when no server URL was set
  useEffect(() => {
    if (image_url || !event_id) return
    let objectURL = null
    let cancelled = false
    getObjectURL(adImgKey(event_id)).then((url) => {
      if (cancelled) return
      objectURL = url
      setLocalImage(url)
    })
    return () => {
      cancelled = true
      if (objectURL) URL.revokeObjectURL(objectURL)
    }
  }, [image_url, event_id])

  useEffect(() => {
    if (!open) return
    function onKey(e) { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const img = image_url || localImage

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Click to view"
        className="group text-left w-full bg-gray-900/60 backdrop-blur-sm border border-white/5 hover:border-purple-500/30 rounded-2xl overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1 cursor-pointer focus:outline-none"
      >
        {img ? (
          <div className="relative w-full h-44 bg-gray-950 flex items-center justify-center overflow-hidden">
            <img src={img} alt={headline || ''} className="w-full h-full object-contain" />
            <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors">
              <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 bg-black/70 text-white text-xs font-medium px-3 py-1.5 rounded-full">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="7" /><path strokeLinecap="round" d="M21 21l-4.35-4.35M11 8v6M8 11h6" />
                </svg>
                Click to zoom
              </span>
            </span>
          </div>
        ) : (
          <div className="w-full h-32 bg-linear-to-br from-purple-900/60 to-violet-950/60 flex items-center justify-center">
            <svg className="w-10 h-10 text-purple-500/50" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a3 3 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
            </svg>
          </div>
        )}
        <div className="p-5 flex-1 flex flex-col w-full">
          {headline && <h3 className="font-bold text-base mb-1.5 leading-snug">{headline}</h3>}
          {body && <p className="text-gray-400 text-sm leading-relaxed mb-4 flex-1 line-clamp-3">{body}</p>}
          <span className="mt-auto inline-block bg-purple-600 group-hover:bg-purple-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors text-center">
            {cta_text}
          </span>
        </div>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-6"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div className="w-full max-w-2xl max-h-full bg-gray-900 border border-gray-800 rounded-2xl overflow-y-auto shadow-2xl">
            {img && (
              <div className="w-full max-h-[60vh] bg-gray-950 flex items-center justify-center overflow-hidden">
                <img src={img} alt={headline || ''} className="w-full h-full max-h-[60vh] object-contain" />
              </div>
            )}
            <div className="p-6 sm:p-8">
              {headline && <h2 className="text-2xl font-bold text-white mb-2 leading-snug">{headline}</h2>}
              {body && <p className="text-gray-400 leading-relaxed mb-6">{body}</p>}
              {to ? (
                <Link
                  to={to}
                  className="inline-block bg-purple-600 hover:bg-purple-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
                >
                  {cta_text}
                </Link>
              ) : (
                <span className="inline-block bg-purple-600/60 text-white font-semibold px-6 py-3 rounded-xl">
                  {cta_text}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="absolute top-5 right-5 text-white/80 hover:text-white transition-colors"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </>
  )
}
