import { useState } from 'react'

// Single-series daily bar chart for the superuser overview. One measure per
// chart (never two y-scales); the title names the series, so no legend box.
// Hover (or keyboard focus) on a day shows its value; the same numbers are
// available as a table under "View data".

const WIDTH = 600
const HEIGHT = 180
const PAD = { top: 14, right: 8, bottom: 34, left: 66 }
const BAR_COLOR = '#2A77F8' // logo blue (purple-500 in the theme) — validated against the dark card surface

function niceMax(value) {
  if (value <= 0) return 1
  const pow = 10 ** Math.floor(Math.log10(value))
  const step = [1, 2, 2.5, 5, 10].find((s) => s * pow >= value)
  return step * pow
}

function shortDate(iso) {
  const [, m, d] = iso.split('-')
  return `${Number(m)}/${Number(d)}`
}

export default function DailyBarChart({ title, data, valueKey, format = (v) => String(v) }) {
  const [hover, setHover] = useState(null)

  const values = data.map((d) => d[valueKey])
  const total = values.reduce((a, b) => a + b, 0)
  const max = niceMax(Math.max(0, ...values))
  const plotW = WIDTH - PAD.left - PAD.right
  const plotH = HEIGHT - PAD.top - PAD.bottom
  const slot = plotW / Math.max(1, data.length)
  const gap = 2
  const barW = Math.max(1, slot - gap)
  const y = (v) => PAD.top + plotH - (v / max) * plotH
  const ticks = [0, max / 2, max]
  const hovered = hover !== null ? data[hover] : null

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h3 className="text-sm font-semibold text-gray-300">{title}</h3>
        <p className="text-sm text-gray-400">
          <span className="text-white font-semibold">{format(total)}</span> in 30 days
        </p>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full h-auto block"
          role="img"
          aria-label={`${title}, last 30 days. Total ${format(total)}.`}
          onMouseLeave={() => setHover(null)}
        >
          {/* Recessive grid + y labels */}
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(t)} y2={y(t)} stroke="#18203F" strokeWidth="1" />
              <text x={PAD.left - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize="20" fill="#8590B0">
                {format(t)}
              </text>
            </g>
          ))}

          {data.map((d, i) => {
            const v = d[valueKey]
            const x = PAD.left + i * slot + gap / 2
            const top = y(v)
            const h = PAD.top + plotH - top
            const r = Math.min(4, barW / 2, h)
            return (
              <g key={d.date}>
                {v > 0 && (
                  // Rounded top, square base anchored to the baseline.
                  <path
                    d={`M${x},${top + h} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${top + h} Z`}
                    fill={BAR_COLOR}
                    opacity={hover === null || hover === i ? 1 : 0.45}
                  />
                )}
                {/* Hit target spans the full column height, wider than the bar. */}
                <rect
                  x={PAD.left + i * slot}
                  y={PAD.top}
                  width={slot}
                  height={plotH}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${shortDate(d.date)}: ${format(v)}`}
                  onMouseEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                />
              </g>
            )
          })}

          {/* Baseline + sparse x labels (first, middle, last) */}
          <line x1={PAD.left} x2={WIDTH - PAD.right} y1={PAD.top + plotH} y2={PAD.top + plotH} stroke="#252E52" strokeWidth="1" />
          {[0, Math.floor(data.length / 2), data.length - 1].map((i) =>
            data[i] ? (
              <text
                key={i}
                x={i === 0 ? PAD.left : i === data.length - 1 ? WIDTH - PAD.right : PAD.left + i * slot + slot / 2}
                y={HEIGHT - 6}
                textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}
                fontSize="20"
                fill="#8590B0"
              >
                {shortDate(data[i].date)}
              </text>
            ) : null,
          )}
        </svg>

        {hovered && (
          <div
            className="pointer-events-none absolute -top-1 -translate-x-1/2 -translate-y-full bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs shadow-lg whitespace-nowrap"
            style={{ left: `${((PAD.left + hover * slot + slot / 2) / WIDTH) * 100}%` }}
          >
            <span className="text-gray-400">{new Date(`${hovered.date}T00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
            <span className="text-white font-semibold ml-2">{format(hovered[valueKey])}</span>
          </div>
        )}
      </div>

      <details className="mt-2">
        <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300">View data</summary>
        <div className="max-h-48 overflow-y-auto mt-2">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 text-left">
                <th className="py-1 font-medium">Date</th>
                <th className="py-1 font-medium text-right">{title}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.date} className="border-t border-gray-800 text-gray-300">
                  <td className="py-1">{d.date}</td>
                  <td className="py-1 text-right">{format(d[valueKey])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}
