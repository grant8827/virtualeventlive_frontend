export const money = (v) =>
  `$${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// Chart axis labels: whole dollars keep the y-axis short, but small scales
// keep cents so $0.50 doesn't read as $1.
export const moneyShort = (v) =>
  v >= 10 || Number.isInteger(v)
    ? `$${Math.round(v).toLocaleString()}`
    : `$${v.toFixed(2)}`

export const count = (v) => Number(v || 0).toLocaleString()

export const date = (iso) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

export const inputClass =
  'bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors'
