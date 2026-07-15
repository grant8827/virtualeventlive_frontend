export default function TBar({ value, onChange, onCut }) {
  return (
    <div className="flex flex-col items-center justify-between py-2 w-12 shrink-0 gap-2">
      <span className="text-xs text-gray-600 font-mono tabular-nums">{value}%</span>
      <div
        className="relative flex items-center justify-center"
        style={{ height: '10rem', width: '2.5rem' }}
      >
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          onMouseUp={() => { if (value >= 50) onCut() }}
          onTouchEnd={() => { if (value >= 50) onCut() }}
          className="cursor-pointer accent-yellow-400"
          style={{
            transform: 'rotate(-90deg)',
            width: '10rem',
            position: 'absolute',
          }}
        />
      </div>
      <button
        onClick={onCut}
        title="Cut: move Preview to Program"
        className="text-xs bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-2 py-1.5 rounded-lg transition-colors w-full"
      >
        CUT
      </button>
    </div>
  )
}
