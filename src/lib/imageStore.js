const DB_NAME    = 'vel-images'
const STORE_NAME = 'ticket-images'
const DB_VERSION = 1

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE_NAME)
    }
    req.onsuccess  = (e) => resolve(e.target.result)
    req.onerror    = (e) => reject(e.target.error)
  })
}

export async function saveImage(key, blob) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(blob, key)
    tx.oncomplete = resolve
    tx.onerror    = (e) => reject(e.target.error)
  })
}

export async function getImage(key) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(key)
    req.onsuccess = (e) => resolve(e.target.result ?? null)
    req.onerror   = (e) => reject(e.target.error)
  })
}

export async function deleteImage(key) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(key)
    tx.oncomplete = resolve
    tx.onerror    = (e) => reject(e.target.error)
  })
}

// Returns a blob: object URL ready for <img src> or CSS background.
// Caller is responsible for revoking it when done (URL.revokeObjectURL).
export async function getObjectURL(key) {
  const blob = await getImage(key)
  return blob ? URL.createObjectURL(blob) : null
}

export function imgKey(eventId) {
  return `ticket-img-${eventId}`
}

export function adImgKey(eventId) {
  return `ad-img-${eventId}`
}
