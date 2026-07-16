import { useState, useRef, useEffect } from 'react'

const FONT_OPTIONS = [
  ['Arial, sans-serif', 'Arial'],
  ['Georgia, serif', 'Georgia'],
  ['"Courier New", monospace', 'Courier New'],
  ['"Times New Roman", serif', 'Times New Roman'],
  ['Verdana, sans-serif', 'Verdana'],
  ['Impact, sans-serif', 'Impact'],
]

export default function Ticker({ onUpdate }) {
  const [text, setText] = useState('')
  const [active, setActive] = useState(false)
  const [color, setColor] = useState('#ffffff')
  const [font, setFont] = useState(FONT_OPTIONS[0][0])
  const [scroll, setScroll] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const settingsRef = useRef(null)

  useEffect(() => {
    if (!showSettings) return
    function handleClickOutside(e) {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setShowSettings(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showSettings])

  function start() {
    if (!text.trim()) return
    setActive(true)
    onUpdate({ text: text.trim(), active: true, color, font, scroll })
  }

  function stop() {
    setActive(false)
    onUpdate({ active: false })
  }

  // Pushes a setting change straight to the live overlay too, so adjusting
  // color/font/scroll while the ticker is already on air updates it
  // immediately instead of requiring a Stop/Start.
  function updateSetting(patch) {
    if ('color' in patch) setColor(patch.color)
    if ('font' in patch) setFont(patch.font)
    if ('scroll' in patch) setScroll(patch.scroll)
    onUpdate(patch)
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
        placeholder="Put your banner message here"
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

      <div className="relative" ref={settingsRef}>
        <button
          onClick={() => setShowSettings((v) => !v)}
          title="Ticker settings"
          className="text-gray-500 hover:text-gray-300 border border-gray-700 hover:border-gray-600 rounded-lg w-8 h-8 flex items-center justify-center transition-colors shrink-0"
        >
          ⚙
        </button>

        {showSettings && (
          <div className="absolute bottom-full right-0 mb-2 z-20 bg-gray-900 border border-gray-700 rounded-xl p-3 w-56 shadow-xl space-y-3">
            <div>
              <label className="block text-[10px] text-gray-500 mb-1">Text color</label>
              <input
                type="color"
                value={color}
                onChange={(e) => updateSetting({ color: e.target.value })}
                className="w-full h-8 rounded-lg bg-gray-800 border border-gray-700 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-[10px] text-gray-500 mb-1">Font</label>
              <select
                value={font}
                onChange={(e) => updateSetting({ font: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500 transition-colors"
              >
                {FONT_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-500">Scrolling text</span>
              <button
                onClick={() => updateSetting({ scroll: !scroll })}
                className={`text-[10px] px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                  scroll ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                }`}
              >
                {scroll ? 'On' : 'Off'}
              </button>
            </div>
          </div>
        )}
      </div>

      {active && (
        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse shrink-0" />
      )}
    </div>
  )
}
