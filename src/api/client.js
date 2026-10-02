import { apiUrl } from './url'

const BASE = '/api/v1'

// Sign-in is a server-side session carried by an HttpOnly cookie the browser
// sends automatically (credentials: 'include'); no token is ever stored or
// readable by page scripts. 'vel_user' only caches display info (name/role).
function markSessionExpired(path) {
  if (path === '/auth/login' || !localStorage.getItem('vel_user')) return
  localStorage.removeItem('vel_user')
  window.dispatchEvent(new Event('auth:expired'))
}

async function request(method, path, body, extraHeaders = {}) {
  const headers = { 'Content-Type': 'application/json', ...extraHeaders }

  const res = await fetch(apiUrl(BASE + path), {
    method,
    headers,
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  let data
  try {
    data = await res.json()
  } catch {
    data = {}
  }

  if (!res.ok) {
    if (res.status === 401) markSessionExpired(path)
    const err = new Error(data.error || `Request failed (${res.status})`)
    err.status = res.status
    err.code = data.code
    throw err
  }
  return data
}

async function upload(path, file) {
  const body = new FormData()
  body.append('image', file)

  const res = await fetch(apiUrl(BASE + path), { method: 'POST', credentials: 'include', body })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 401) markSessionExpired(path)
    throw new Error(data.error || `Upload failed (${res.status})`)
  }
  return data
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  patch: (path, body) => request('PATCH', path, body),
  del: (path) => request('DELETE', path),
  upload,
  secureGet: (path, payoutToken) => request('GET', path, undefined, { 'X-Payout-Token': payoutToken }),
  securePost: (path, body, payoutToken) => request('POST', path, body, { 'X-Payout-Token': payoutToken }),
}
