const DEFAULT_PRODUCTION_API_ORIGIN = 'https://radioinonestopbackennd-production.up.railway.app'

export const API_ORIGIN = (
  import.meta.env.VITE_API_URL || (import.meta.env.PROD ? DEFAULT_PRODUCTION_API_ORIGIN : '')
).replace(/\/$/, '')

export function apiUrl(path) {
  return `${API_ORIGIN}${path}`
}

export function apiWebSocketUrl(path) {
  if (!API_ORIGIN) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}${path}`
  }

  const url = new URL(path, API_ORIGIN)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return url.toString()
}
