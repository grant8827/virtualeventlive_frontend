import { useState } from 'react'

export default function SourceBank({ sources, pvwLabel, onAddCamera, onAddScreen, onSelectPvw }) {
  const [adding, setAdding] = useState('')

  async function handleAddCamera() {
    setAdding('camera')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      const label = `Camera ${sources.length + 1}`
      onAddCamera(stream, label)
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
      const label = `Screen ${sources.length + 1}`
      onAddScreen(stream, label)
    } catch {
      // user cancelled — silent
    } finally {
      setAdding('')
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-gray-600 uppercase tracking-widest font-semibold mr-1">Sources</span>
      <button
        onClick={handleAddCamera}
        disabled={!!adding}
        className="flex items-center gap-1.5 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 text-gray-300 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
      >
        {adding === 'camera' ? '…' : '📷 + Camera'}
      </button>
      <button
        onClick={handleAddScreen}
        disabled={!!adding}
        className="flex items-center gap-1.5 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 text-gray-300 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
      >
        {adding === 'screen' ? '…' : '🖥 + Screen'}
      </button>
      {sources.length > 0 && <div className="w-px h-4 bg-gray-700 mx-1" />}
      {sources.map((src) => {
        const isInPvw = pvwLabel === src.label
        return (
          <button
            key={src.id}
            onClick={() => onSelectPvw(src.stream, src.label)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              isInPvw
                ? 'border-yellow-500 bg-yellow-950 text-yellow-300'
                : 'border-gray-700 bg-gray-800 hover:bg-gray-700 text-gray-300'
            }`}
          >
            {isInPvw ? '▶ ' : ''}{src.label}
          </button>
        )
      })}
    </div>
  )
}
