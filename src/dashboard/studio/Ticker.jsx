import { useState } from 'react'

export default function Ticker({ onUpdate }) {
  const [text, setText] = useState('')
  const [active, setActive] = useState(false)

  function start() {
    if (!text.trim()) return
    setActive(true)
    onUpdate(text.trim(), true)
  }

  function stop() {
    setActive(false)
    onUpdate('', false)
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-600 uppercase tracking-widest font-semibold w-12 shrink-0">
        Ticker
      </span>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') active ? stop() : start() }}
        placeholder="Breaking news · Sponsor message · Event info…"
        className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
      />
      {active ? (
        <button
          onClick={stop}
          className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg transition-colors shrink-0"
        >
          Stop
        </button>
      ) : (
        <button
          onClick={start}
          disabled={!text.trim()}
          className="text-xs bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg transition-colors shrink-0"
        >
          Start
        </button>
      )}
      {active && (
        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse shrink-0" />
      )}
    </div>
  )
}
