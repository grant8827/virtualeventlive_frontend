import { useEffect, useState } from 'react'
import { api } from './client'

// The venue rate lives on the backend (HOURLY_RATE); the backend also
// calculates the real fee. This default only shows until /pricing answers.
const DEFAULT_HOURLY_RATE = 15

let request = null

function loadHourlyRate() {
  if (!request) {
    request = api
      .get('/pricing')
      .then((data) => Number(data.hourly_rate) || DEFAULT_HOURLY_RATE)
      .catch(() => {
        request = null // try again next time
        return DEFAULT_HOURLY_RATE
      })
  }
  return request
}

// Venue fee per hour, in dollars. Fetched once and shared by every page.
export function useHourlyRate() {
  const [rate, setRate] = useState(DEFAULT_HOURLY_RATE)
  useEffect(() => {
    let cancelled = false
    loadHourlyRate().then((r) => {
      if (!cancelled) setRate(r)
    })
    return () => {
      cancelled = true
    }
  }, [])
  return rate
}

export const formatRate = (rate) => `$${Number.isInteger(rate) ? rate : rate.toFixed(2)}/hr`
